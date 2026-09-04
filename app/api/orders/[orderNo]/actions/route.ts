import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeOrder,
  findOrderByLookupKey,
  parseOrderLookup,
} from "@/lib/payment-utils";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { requireCustomer } from "@/lib/customer-auth";
import {
  CANCELLATION_REASONS,
  REFUND_REASONS,
  appendHistory,
  canCustomerCancel,
  canRequestRefund,
  canTransition,
  historyToJson,
  normalizeOrderStatus,
} from "@/lib/orderWorkflow";

type ActionBody = {
  email?: string;
  action?: "cancel" | "refund-request";
  reason?: string;
  reasonDetails?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const body = (await req.json().catch(() => ({}))) as ActionBody;

    const order = await findOrderByLookupKey(parseOrderLookup(orderNo));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Identity is preferred from the signed session cookie (logged-in customer).
    // Guests may still act on an order, but ONLY with a valid email that matches
    // the order. Never allow an order to be modified without any ownership proof.
    let email: string | null = null;
    const auth = await requireCustomer(req);
    if (!auth.response && (auth.user.email as string).toLowerCase() === order.email.trim().toLowerCase()) {
      email = auth.user.email;
    }
    if (!email) {
      const bodyEmail = String(body.email || "").trim().toLowerCase();
      if (bodyEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bodyEmail) && bodyEmail === order.email.trim().toLowerCase()) {
        email = order.email.trim().toLowerCase();
      }
    }
    if (!email) {
      return NextResponse.json(
        { error: "You are not authorized to modify this order." },
        { status: 403 }
      );
    }

    const action = body.action;

    if (action === "cancel") {
      if (!canCustomerCancel(order.status)) {
        return NextResponse.json(
          { error: `Order #${order.orderNo} can no longer be cancelled.` },
          { status: 409 }
        );
      }
      if (!canTransition(order.status, "Cancel Requested")) {
        return NextResponse.json(
          { error: `Order #${order.orderNo} can no longer be cancelled.` },
          { status: 409 }
        );
      }
      if (normalizeOrderStatus(order.status) === "Cancel Requested") {
        return NextResponse.json(
          { error: `A cancellation request for order #${order.orderNo} is already being reviewed.` },
          { status: 409 }
        );
      }
      const reason = String(body.reason || "").trim();
      if (!CANCELLATION_REASONS.includes(reason as (typeof CANCELLATION_REASONS)[number])) {
        return NextResponse.json(
          { error: "A valid cancellation reason is required." },
          { status: 400 }
        );
      }

      const history = appendHistory(order.statusHistory, {
        from: order.status,
        to: "Cancel Requested",
        changedBy: email,
        note: `Cancellation requested: ${reason}${String(body.reasonDetails || "").trim() ? ` — ${String(body.reasonDetails).trim()}` : ""}`,
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "Cancel Requested",
          cancelledBy: email,
          cancellationReason: reason,
          cancellationReasonDetails: String(body.reasonDetails || "").trim() || null,
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });

      await notifyAdmin({
        type: "order",
        title: "Cancellation Requested by Customer",
        message: `Order #${updated.orderNo} — the customer requested cancellation. Reason: ${reason}.`,
        link: "/admin/orders",
      });
      await notifyCustomer(updated.email, {
        type: "status",
        title: "Cancellation Request Received",
        message: `Your cancellation request for order #${updated.orderNo} has been received and is being reviewed.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });

      return NextResponse.json({ order: serializeOrder(updated) });
    }

    if (action === "refund-request") {
      if (!canRequestRefund(order.status)) {
        return NextResponse.json(
          { error: "A refund can only be requested after the order has been delivered." },
          { status: 409 }
        );
      }
      if (order.refundStatus === "REFUNDED" || order.refundStatus === "REQUESTED") {
        return NextResponse.json(
          { error: "A refund has already been requested or completed for this order." },
          { status: 409 }
        );
      }
      const reason = String(body.reason || "").trim();
      if (!REFUND_REASONS.includes(reason as (typeof REFUND_REASONS)[number])) {
        return NextResponse.json(
          { error: "A valid refund reason is required." },
          { status: 400 }
        );
      }

      const history = appendHistory(order.statusHistory, {
        from: order.status,
        to: "Refund Requested",
        changedBy: email,
        note: `Refund requested: ${reason}`,
      });

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "Refund Requested",
          refundStatus: "REQUESTED",
          refundReason: reason,
          refundReasonDetails: String(body.reasonDetails || "").trim() || null,
          refundRequestedAt: new Date(),
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });

      await notifyAdmin({
        type: "payment",
        title: "Refund Requested by Customer",
        message: `Refund requested for order #${updated.orderNo}. Reason: ${reason}.`,
        link: "/admin/orders",
      });
      await notifyCustomer(updated.email, {
        type: "payment",
        title: "Refund Requested",
        message: `Your refund request for order #${updated.orderNo} has been received.`,
        link: `/orders/${updated.orderNo}?email=${encodeURIComponent(updated.email)}`,
      });

      return NextResponse.json({ order: serializeOrder(updated) });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("Error handling customer order action:", error);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}
