import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  markOrderPaid,
  setOrderPaymentStatusIfChanged,
  amountMatches,
} from "@/lib/payment-utils";
import { verifyEasypaisaCallback } from "@/lib/payments/easypaisa-provider";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { rateLimitSafe } from "@/lib/rateLimit";

/**
 * POST /api/payments/easypaisa/webhook
 *
 * Easypaisa IPN (Instant Payment Notification) callback endpoint.
 *
 * Easypaisa sends an HTTP POST (form-encoded) to this URL after the customer
 * completes or fails a payment on the hosted checkout page.
 *
 * ── IPN VERIFICATION FLOW ────────────────────────────────────────────────────
 *
 * 1. Parse form-encoded body into key-value pairs
 * 2. Verify the HMAC-SHA256 signature:
 *
 *      expected = HMAC-SHA256(
 *        hashKey,
 *        StoreId + OrderId + TransactionAmount + ResponseCode
 *      )
 *
 *    Compare `expected` against the `signature` field using constant-time
 *    comparison (timingSafeEqual) to prevent timing attacks.
 *
 * 3. Look up the order by OrderId (our paymentReference)
 * 4. Verify the amount matches the authoritative order record
 * 5. Process idempotently — duplicate IPNs never double-decrement stock
 *
 * ── SECURITY MODEL ───────────────────────────────────────────────────────────
 *
 * - Never trusts raw query/form parameters for payment decisions
 * - Signature verification is the authoritative gate
 * - Amount is always cross-checked against the database order record
 * - rateLimitSafe is fail-open (never blocks legitimate provider retries)
 * - Processing is idempotent via atomic markOrderPaid transitions
 * ──────────────────────────────────────────────────────────────────────────────
 */
export async function POST(req: NextRequest) {
  // Fail-open rate limiter — a runaway ceiling only. Signature verification
  // below is the authoritative security gate. Legitimate Easypaisa retries
  // must never be blocked by this limiter.
  const webhookLimited = rateLimitSafe(req, {
    windowMs: 60_000,
    max: 600,
    label: "easypaisa-webhook",
  });
  if (webhookLimited) return webhookLimited;

  // ── 1. Parse IPN body ──────────────────────────────────────────────
  //
  // Easypaisa sends form-encoded data (application/x-www-form-urlencoded).
  const raw = await req.text();
  const params: Record<string, string> = {};
  try {
    const sp = new URLSearchParams(raw);
    sp.forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    // Malformed body — acknowledge to prevent retries, but do nothing
    return NextResponse.json({ ok: true });
  }

  // ── 2. Verify HMAC-SHA256 signature ────────────────────────────────
  //
  // verifyEasypaisaCallback recomputes:
  //   HMAC-SHA256(hashKey, StoreId + OrderId + TransactionAmount + ResponseCode)
  // and compares against the received signature using timingSafeEqual.
  const { valid, status, txn } = await verifyEasypaisaCallback(params);

  if (!valid) {
    console.error("[EASYPAISA_IPN] Invalid or unverifiable signature");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (!txn) {
    return NextResponse.json({ ok: true });
  }

  // ── 3. Look up the order ───────────────────────────────────────────
  //
  // Match by transactionId (Easypaisa's TransactionId) or paymentReference
  // (our generated OrderId that was sent to Easypaisa).
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { transactionId: txn },
        { paymentReference: txn },
      ],
    },
  });

  if (!order) {
    console.warn("[EASYPAISA_IPN] No order matched for txn:", txn);
    return NextResponse.json({ ok: true });
  }

  // ── 4. Handle PAID status ──────────────────────────────────────────
  if (status === "PAID") {
    // Verify the amount matches what we sent to Easypaisa.
    // Easypaisa sends TransactionAmount — cross-check against order total.
    const reportedAmount =
      Number(params.TransactionAmount) || Number(params.amount) || 0;

    // amountMatches checks: order.total (in rupees) * 100 === reportedAmount (in paisa)
    if (!amountMatches(order.total, reportedAmount * 100, order.currency)) {
      console.error(
        "[EASYPAISA_IPN] Amount mismatch:",
        order.orderNo,
        "expected:",
        order.total,
        "received:",
        reportedAmount
      );
      return NextResponse.json({ ok: true });
    }

    // Guard: don't overwrite if already bound to a different transaction
    if (order.transactionId && order.transactionId !== txn) {
      return NextResponse.json({ ok: true });
    }

    // Persist the Easypaisa transaction ID if not yet set
    if (!order.transactionId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { transactionId: txn },
      });
    }

    // Atomic, idempotent PAID transition — handles stock decrement, status
    // advancement, and notifications. Duplicate IPNs are safe.
    const result = await markOrderPaid(order.id);
    if (result.ok && !result.alreadyPaid) {
      await notifyAdmin({
        type: "payment",
        title: "Payment Received (Easypaisa)",
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

  // ── 5. Handle FAILED status ────────────────────────────────────────
  else if (status === "FAILED") {
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

  // ── 6. Acknowledge receipt ─────────────────────────────────────────
  //
  // Always return 200 to Easypaisa. A non-200 response triggers retries,
  // but we've already handled the payment above idempotently.
  return NextResponse.json({ ok: true });
}
