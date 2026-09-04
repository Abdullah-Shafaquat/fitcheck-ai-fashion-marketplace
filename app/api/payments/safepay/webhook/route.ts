import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  markOrderPaid,
  setOrderPaymentStatusIfChanged,
  amountMatches,
} from "@/lib/payment-utils";
import {
  fetchSafePayPayment,
  verifySafePayWebhookSignature,
  safepayCredentialsConfigured,
} from "@/lib/safepay";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { rateLimitSafe } from "@/lib/rateLimit";

async function findOrderByTracker(tracker: string, metadataOrderId?: unknown) {
  const where: Array<{ transactionId: string } | { paymentReference: string }> = [
    { transactionId: tracker },
  ];
  if (metadataOrderId && typeof metadataOrderId === "string") {
    where.push({ paymentReference: metadataOrderId });
  }
  return prisma.order.findFirst({ where: { OR: where } });
}

export async function POST(req: NextRequest) {
  // Provider webhooks are server-to-server and must never be blocked by a
  // browser-style IP limiter. rateLimitSafe is a fail-open, fixed-key runaway
  // ceiling only — signature verification below is the authoritative gate.
  const webhookLimited = rateLimitSafe(req, { windowMs: 60_000, max: 600, label: "safepay-webhook" });
  if (webhookLimited) return webhookLimited;

  const rawBody = await req.text();
  let payload: {
    type?: string;
    tracker?: string;
    state?: string;
    data?: {
      tracker?: string;
      state?: string;
      metadata?: { order_id?: string };
    };
  } | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  const signature = req.headers.get("x-sfpy-signature");
  // Canonical secret is SAFEPAY_WEBHOOK_SECRET. Fall back to the legacy
  // SAFTPAY_WEBHOOK_SECRET spelling so existing deployments keep working until
  // they rotate. Never log the value.
  const webhookSecret =
    process.env.SAFEPAY_WEBHOOK_SECRET || process.env.SAFTPAY_WEBHOOK_SECRET || "";
  const signatureVerified =
    !!webhookSecret &&
    typeof signature === "string" &&
    signature.length > 0 &&
    verifySafePayWebhookSignature(rawBody, signature, webhookSecret);

  // Fail closed whenever payment credentials are configured: an environment that
  // can actually confirm (mark paid) an order must never accept an unverified
  // callback. Without a webhook secret we reject rather than proceed.
  if (!signatureVerified && safepayCredentialsConfigured()) {
    console.error(
      "Safepay webhook: missing or invalid signature with credentials configured — rejecting (fail closed)."
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (!webhookSecret) {
    console.warn(
      "Safepay webhook: SAFEPAY_WEBHOOK_SECRET is not set — no payment can be confirmed via this webhook. " +
      "Set SAFEPAY_WEBHOOK_SECRET in .env for production."
    );
  }

  try {
    const eventType: string = payload?.type || "";
    const data = payload?.data || {};
    const tracker: string =
      (typeof data?.tracker === "string" && data.tracker) ||
      (typeof payload?.tracker === "string" && payload.tracker) ||
      "";

    const legacyEnded =
      (payload?.state === "TRACKER_ENDED" || data?.state === "TRACKER_ENDED") &&
      !eventType;

    if (eventType === "payment.succeeded" || legacyEnded || data?.state === "TRACKER_ENDED") {
      if (!tracker) {
        return NextResponse.json({ received: true });
      }

      const order = await findOrderByTracker(tracker, data?.metadata?.order_id);
      if (!order) {
        return NextResponse.json({ received: true });
      }
      if (order.paymentStatus === "PAID") {
        return NextResponse.json({ received: true });
      }

      if (safepayCredentialsConfigured() && signatureVerified) {
        const payment = await fetchSafePayPayment(tracker);
        const paid =
          payment.paymentState === "PAID" &&
          amountMatches(order.total, payment.amount, payment.currency);
        if (paid) {
          const result = await markOrderPaid(order.id, { method: payment.method });
          if (result.ok && !result.alreadyPaid) {
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
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    if (eventType === "payment.failed" || data?.state === "TRACKER_FAILED" || data?.state === "TRACKER_DECLINED") {
      if (tracker) {
        const order = await findOrderByTracker(tracker, data?.metadata?.order_id);
        if (order) {
          const { changed } = await setOrderPaymentStatusIfChanged(order.id, "FAILED");
          if (changed) {
            await notifyCustomer(order.email, {
              type: "payment",
              title: "Payment Failed",
              message: `Your payment for order #${order.orderNo} was not completed.`,
              link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
            });
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    if (eventType === "payment.cancelled" || data?.state === "TRACKER_CANCELLED") {
      if (tracker) {
        const order = await findOrderByTracker(tracker, data?.metadata?.order_id);
        if (order) {
          const { changed } = await setOrderPaymentStatusIfChanged(order.id, "CANCELLED");
          if (changed) {
            await notifyCustomer(order.email, {
              type: "payment",
              title: "Payment Cancelled",
              message: `Your payment for order #${order.orderNo} was cancelled.`,
              link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
            });
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Safepay webhook processing error:", error);
    return NextResponse.json({ received: true });
  }
}
