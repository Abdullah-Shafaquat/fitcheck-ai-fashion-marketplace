import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyCustomer, notifyAdmin } from "@/lib/notify";
import {
  markOrderPaid,
  restoreOrderStock,
  isCodOrder,
  serializeOrder,
} from "@/lib/payment-utils";
import {
  canTransition,
  appendHistory,
  getStatusBefore,
  CANCELLATION_REASONS,
  REFUND_REASONS,
  validNextStatuses,
  normalizeOrderStatus,
  isTerminalStatus,
  computeExpectedDeliveryRange,
  historyToJson,
} from "@/lib/orderWorkflow";
import {
  applyEarningsForDeliveredOrder,
  reverseEarningsForOrder,
} from "@/lib/sellerEarnings";

const statusMessages: Record<string, { title: string; message: string }> = {
  Confirmed: { title: "Order Confirmed", message: "has been confirmed." },
  Processing: { title: "Your Order Is Being Processed", message: "is now being processed." },
  Packed: { title: "Your Order Has Been Packed", message: "has been packed and is ready for shipment." },
  Shipped: { title: "Your Order Has Been Shipped", message: "has been shipped." },
  "Out for Delivery": { title: "Your Order Is Out for Delivery", message: "is out for delivery." },
  Delivered: { title: "Your Order Has Been Delivered", message: "has been delivered." },
  Cancelled: { title: "Order Cancelled", message: "has been cancelled." },
  "Refund Requested": { title: "Refund Requested", message: "refund request has been received." },
  "Refund Approved": { title: "Refund Approved", message: "refund request has been approved." },
  Refunded: { title: "Refund Completed", message: "refund has been completed." },
  "Refund Rejected": { title: "Refund Request Declined", message: "refund request was declined." },
};

function transitionDenied(from: string, to: string) {
  const norm = normalizeOrderStatus(from);
  return NextResponse.json(
    {
      error: `Order status cannot move from "${from}" to "${to}".`,
      allowedNext: validNextStatuses(norm),
    },
    { status: 409 }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  let id: string;
  let body: {
    status?: string;
    paymentAction?: string;
    refundAction?: string;
    cancellationAction?: string;
    method?: string;
    cancellationReason?: string;
    cancellationReasonDetails?: string;
    refundReason?: string;
    refundReasonDetails?: string;
    trackingNumber?: string;
    carrier?: string;
  };
  try {
    ({ id } = await params);
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const paymentAction = body.paymentAction;
    const refundAction = body.refundAction;
    const cancellationAction = body.cancellationAction;

    if (paymentAction === "paid") {
      const result = await markOrderPaid(id, { method: body.method });
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 400 });
      }
      if (!result.alreadyPaid) {
        await notifyCustomer(existing.email, {
          type: "payment",
          title: "Payment Confirmed",
          message: `Payment for order #${existing.orderNo} has been confirmed. Thank you!`,
          link: `/orders/${existing.orderNo}?email=${encodeURIComponent(existing.email)}`,
        });
      }
      const updated = await prisma.order.findUnique({ where: { id } });
      return NextResponse.json({ order: serializeOrder(updated!) });
    }

    // ---- Refund workflow actions ----
    if (refundAction === "request") {
      const refundReason = String(body.refundReason || "").trim();
      if (!REFUND_REASONS.includes(refundReason as (typeof REFUND_REASONS)[number])) {
        return NextResponse.json({ error: "A valid refund reason is required." }, { status: 400 });
      }
      if (!canTransition(existing.status, "Refund Requested")) {
        return transitionDenied(existing.status, "Refund Requested");
      }
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Refund Requested",
        changedBy: "admin",
        note: `Refund requested: ${refundReason}`,
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Refund Requested",
          refundStatus: "REQUESTED",
          refundReason,
          refundReasonDetails: String(body.refundReasonDetails || "").trim() || null,
          refundRequestedAt: new Date(),
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "payment",
        title: "Refund Requested",
        message: `Your refund request for order #${updated.orderNo} has been received.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (refundAction === "approve") {
      if (normalizeOrderStatus(existing.status) !== "Refund Requested") {
        return NextResponse.json({ error: "Only refund-requested orders can be approved." }, { status: 409 });
      }
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Refund Approved",
        changedBy: "admin",
        note: "Refund approved — pending payment reversal",
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Refund Approved",
          refundStatus: "APPROVED",
          refundApprovedAt: new Date(),
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "payment",
        title: "Refund Approved",
        message: `Your refund request for order #${updated.orderNo} has been approved.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (refundAction === "reject") {
      if (normalizeOrderStatus(existing.status) !== "Refund Requested") {
        return NextResponse.json({ error: "Only refund-requested orders can be rejected." }, { status: 409 });
      }
      const details = String(body.refundReasonDetails || "").trim();
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Refund Rejected",
        changedBy: "admin",
        note: details || "Refund rejected",
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Refund Rejected",
          refundStatus: "REJECTED",
          refundReasonDetails: details || existing.refundReasonDetails,
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "payment",
        title: "Refund Request Declined",
        message: `Your refund request for order #${updated.orderNo} was declined.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (refundAction === "complete" || paymentAction === "refund") {
      const norm = normalizeOrderStatus(existing.status);
      if (norm !== "Refund Approved" && norm !== "Delivered" && existing.refundStatus !== "REQUESTED") {
        if (existing.paymentStatus === "REFUNDED") {
          return NextResponse.json({ error: "This order has already been refunded." }, { status: 400 });
        }
      }

      const refundReason = String(body.refundReason || existing.refundReason || "").trim();
      if (
        refundReason &&
        !REFUND_REASONS.includes(refundReason as (typeof REFUND_REASONS)[number])
      ) {
        return NextResponse.json({ error: "A valid refund reason is required." }, { status: 400 });
      }
      if (!refundReason && !existing.refundReason) {
        return NextResponse.json({ error: "A valid refund reason is required." }, { status: 400 });
      }

      if (norm === "Refund Requested") {
        return NextResponse.json(
          { error: "Approve the refund before completing payment reversal." },
          { status: 409 }
        );
      }

      const wasPaid =
        existing.paymentStatus === "PAID" ||
        (isCodOrder(existing) && existing.paymentStatus === "PENDING");
      if (wasPaid) {
        await restoreOrderStock(id);
      }

      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Refunded",
        changedBy: "admin",
        note: `Refund completed: ${refundReason || existing.refundReason}`,
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Refunded",
          paymentStatus: existing.paymentStatus === "PAID" ? "REFUNDED" : existing.paymentStatus,
          refundStatus: "REFUNDED",
          refundReason: refundReason || existing.refundReason,
          refundReasonDetails:
            String(body.refundReasonDetails || "").trim() || existing.refundReasonDetails,
          refundedAt: new Date(),
          refundedBy: "admin",
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "payment",
        title: "Refund Completed",
        message: `Your refund for order #${updated.orderNo} has been completed.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      await reverseEarningsForOrder(updated.id);
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    // ---- Cancellation approval workflow ----
    if (cancellationAction === "approve") {
      if (normalizeOrderStatus(existing.status) !== "Cancel Requested") {
        return NextResponse.json(
          { error: "Only cancel-requested orders can be approved." },
          { status: 409 }
        );
      }
      const reason = String(body.cancellationReason || existing.cancellationReason || "").trim();
      const wasPaidOrReserved =
        existing.paymentStatus === "PAID" ||
        (isCodOrder(existing) && existing.paymentStatus === "PENDING");
      if (wasPaidOrReserved) {
        await restoreOrderStock(existing.id);
      }
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Cancelled",
        changedBy: "admin",
        note: `Cancellation approved: ${reason || existing.cancellationReason || "customer request"}`,
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Cancelled",
          paymentStatus: existing.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED",
          cancelledAt: existing.cancelledAt || new Date(),
          cancelledBy: existing.cancelledBy || "admin",
          cancellationReason: reason || existing.cancellationReason,
          cancellationReasonDetails: existing.cancellationReasonDetails,
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "status",
        title: "Cancellation Approved",
        message: `Your cancellation request for order #${updated.orderNo} has been approved.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      await reverseEarningsForOrder(updated.id);
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (cancellationAction === "reject") {
      if (normalizeOrderStatus(existing.status) !== "Cancel Requested") {
        return NextResponse.json(
          { error: "Only cancel-requested orders can be rejected." },
          { status: 409 }
        );
      }
      const prevStatus = getStatusBefore(existing.statusHistory, "Cancel Requested");
      if (!prevStatus) {
        return NextResponse.json(
          { error: "Could not determine the order's previous status." },
          { status: 409 }
        );
      }
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: prevStatus,
        changedBy: "admin",
        note: "Cancellation request rejected — order continues normally",
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: prevStatus,
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
          cancellationReasonDetails: null,
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      await notifyCustomer(updated.email, {
        type: "status",
        title: "Cancellation Request Declined",
        message: `Your cancellation request for order #${updated.orderNo} was declined.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    // ---- Status transition ----
    if (!body.status) {
      return NextResponse.json({ error: "Missing status or action" }, { status: 400 });
    }
    const to = body.status;

    if (isTerminalStatus(existing.status) && to !== existing.status) {
      return NextResponse.json(
        { error: `This order is already ${existing.status} and cannot be changed.` },
        { status: 409 }
      );
    }

    if (to === "Cancelled") {
      const reason = String(body.cancellationReason || "").trim();
      if (!CANCELLATION_REASONS.includes(reason as (typeof CANCELLATION_REASONS)[number])) {
        return NextResponse.json({ error: "A valid cancellation reason is required." }, { status: 400 });
      }
      if (!canTransition(existing.status, "Cancelled")) {
        return transitionDenied(existing.status, "Cancelled");
      }
      const wasPaidOrReserved =
        existing.paymentStatus === "PAID" ||
        (isCodOrder(existing) && existing.paymentStatus === "PENDING");
      if (wasPaidOrReserved) {
        await restoreOrderStock(id);
      }
      const history = appendHistory(existing.statusHistory, {
        from: existing.status,
        to: "Cancelled",
        changedBy: "admin",
        note: `Cancelled: ${reason}`,
      });
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: "Cancelled",
          paymentStatus:
            existing.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: "admin",
          cancellationReason: reason,
          cancellationReasonDetails: String(body.cancellationReasonDetails || "").trim() || null,
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      const sm = statusMessages.Cancelled;
      await notifyCustomer(updated.email, {
        type: "status",
        title: sm.title,
        message: `Order #${updated.orderNo} ${sm.message} Reason: ${reason}.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });
      await reverseEarningsForOrder(updated.id);
      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (!canTransition(existing.status, to)) {
      return transitionDenied(existing.status, to);
    }

    const history = appendHistory(existing.statusHistory, {
      from: existing.status,
      to,
      changedBy: "admin",
      note: body.trackingNumber ? `Tracking: ${body.trackingNumber}` : undefined,
    });

    const updateData: Record<string, unknown> = {
      status: to,
      statusHistory: historyToJson(history),
      lastStatusChangeAt: new Date(),
    };

    if (body.trackingNumber?.trim()) {
      updateData.trackingNumber = body.trackingNumber.trim();
    }
    if (body.carrier?.trim()) {
      const snap = existing.addressSnapshot && typeof existing.addressSnapshot === "object"
        ? { ...(existing.addressSnapshot as Record<string, unknown>) }
        : {};
      snap.carrier = body.carrier.trim();
      updateData.addressSnapshot = snap;
    }

    if (to === "Confirmed" && !existing.expectedDeliveryAt) {
      const { start, end } = computeExpectedDeliveryRange(new Date(), existing.country);
      updateData.expectedDeliveryAt = start;
      updateData.expectedDeliveryEndAt = end;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    const sm = statusMessages[to];
    if (sm) {
      await notifyCustomer(order.email, {
        type: "status",
        title: sm.title,
        message: `Order #${order.orderNo} ${sm.message}`,
        link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
      });
    }

    if (to === "Refund Requested") {
      await notifyAdmin({
        type: "payment",
        title: "Refund Request",
        message: `Refund requested for order #${order.orderNo}.`,
        link: "/admin/orders",
      });
    }

    const nextNorm = normalizeOrderStatus(to);
    if (nextNorm === "Delivered") {
      await applyEarningsForDeliveredOrder(order.id);
    } else if (nextNorm === "Cancelled" || nextNorm === "Refunded") {
      await reverseEarningsForOrder(order.id);
    }

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({
    order: serializeOrder(order),
    allowedNext: validNextStatuses(order.status),
  });
}
