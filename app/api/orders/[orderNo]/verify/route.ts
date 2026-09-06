import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeOrder,
  markOrderPaid,
  setOrderPaymentStatus,
  setOrderPaymentStatusIfChanged,
  amountMatches,
  parseOrderLookup,
  findOrderByLookupKey,
} from "@/lib/payment-utils";
import { fetchSafePayPayment, safepayCredentialsConfigured } from "@/lib/safepay";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { PaymentProviderId } from "@/lib/payments";

// Draw the provider from the stored paymentProvider label. Alternate hosted
// flows (JazzCash / Easypaisa) confirm payment via server-side IPN webhooks, so
// for those the database record IS the authoritative state — Safepay's tracker
// API is not consulted.
function providerForOrder(order: { paymentProvider: string | null }): PaymentProviderId {
  const label = (order.paymentProvider || "").trim().toLowerCase();
  if (label.startsWith("jazzcash")) return "jazzcash";
  if (label.startsWith("easypaisa")) return "easypaisa";
  return "safepay";
}

export type VerifyResultStatus = "PAID" | "FAILED" | "CANCELLED" | "PENDING";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params;
    const body = await req.json();
    const tracker: string = typeof body?.tracker === "string" ? body.tracker.trim() : "";

    if (!tracker) {
      return NextResponse.json(
        { error: "Missing payment tracker" },
        { status: 400 }
      );
    }

    const order = await findOrderByLookupKey(parseOrderLookup(orderNo));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({
        status: "PAID" as VerifyResultStatus,
        order: serializeOrder(order),
      });
    }

    if (order.transactionId && order.transactionId !== tracker) {
      return NextResponse.json(
        { error: "Payment session does not match this order" },
        { status: 400 }
      );
    }

    // JazzCash / Easypaisa are verified through their IPN webhooks; there is no
    // public payment lookup, so the recorded DB state is the source of truth.
    const provider = providerForOrder(order);
    if (provider === "jazzcash" || provider === "easypaisa") {
      return NextResponse.json({
        status: order.paymentStatus === "PAID" ? "PAID" : "PENDING",
        order: serializeOrder(order),
      });
    }

    if (!safepayCredentialsConfigured()) {
      return NextResponse.json(
        {
          status: "PENDING" as VerifyResultStatus,
          order: serializeOrder(order),
          error: "Payments are unavailable right now.",
        },
        { status: 200 }
      );
    }

    let payment;
    try {
      payment = await fetchSafePayPayment(tracker);
    } catch (error) {
      console.error("Safepay verify fetch error:", error);
      return NextResponse.json(
        {
          status: "PENDING" as VerifyResultStatus,
          order: serializeOrder(order),
          error: "Could not reach the payment provider. Please refresh or retry.",
        },
        { status: 200 }
      );
    }

    if (payment.paymentState === "PAID") {
      if (!amountMatches(order.total, payment.amount, payment.currency)) {
        await setOrderPaymentStatus(order.id, "FAILED");
        const updated = await prisma.order.findUnique({ where: { id: order.id } });
        return NextResponse.json(
          {
            status: "FAILED" as VerifyResultStatus,
            order: updated ? serializeOrder(updated) : serializeOrder(order),
            error: "Payment amount did not match the order total.",
          },
          { status: 200 }
        );
      }

      const result = await markOrderPaid(order.id, { method: payment.method });
      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      if (result.ok && updated) {
        await notifyAdmin({
          type: "payment",
          title: "Payment Received",
          message: `Order #${order.orderNo} has been paid — Rs ${order.total.toLocaleString()}`,
          link: `/admin/orders`,
        });
        await notifyCustomer(order.email, {
          type: "payment",
          title: "Payment Successful",
          message: `Your payment for order #${order.orderNo} was successful.`,
          link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
        });
        return NextResponse.json({
          status: "PAID" as VerifyResultStatus,
          order: serializeOrder(updated),
        });
      }
      return NextResponse.json(
        {
          status: "PENDING" as VerifyResultStatus,
          order: updated ? serializeOrder(updated) : serializeOrder(order),
          error: result.ok ? undefined : result.reason,
        },
        { status: 200 }
      );
    }

    if (payment.paymentState === "CANCELLED") {
      const { order: updated, changed } = await setOrderPaymentStatusIfChanged(order.id, "CANCELLED");
      if (changed) {
        await notifyCustomer(order.email, {
          type: "payment",
          title: "Payment Cancelled",
          message: `Your payment for order #${order.orderNo} was cancelled.`,
          link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
        });
      }
      return NextResponse.json({
        status: "CANCELLED" as VerifyResultStatus,
        order: updated ? serializeOrder(updated) : serializeOrder(order),
      });
    }

    if (payment.paymentState === "FAILED") {
      const { order: updated, changed } = await setOrderPaymentStatusIfChanged(order.id, "FAILED");
      if (changed) {
        await notifyCustomer(order.email, {
          type: "payment",
          title: "Payment Failed",
          message: `Your payment for order #${order.orderNo} was not completed.`,
          link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
        });
      }
      return NextResponse.json({
        status: "FAILED" as VerifyResultStatus,
        order: updated ? serializeOrder(updated) : serializeOrder(order),
      });
    }

    return NextResponse.json({
      status: "PENDING" as VerifyResultStatus,
      order: serializeOrder(order),
    });
  } catch (error) {
    console.error("Error verifying order payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}