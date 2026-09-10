import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  markOrderPaid,
  setOrderPaymentStatusIfChanged,
  amountMatches,
} from "@/lib/payment-utils";
import { verifyJazzCashIpn } from "@/lib/payments/jazzcash-provider";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import { rateLimitSafe } from "@/lib/rateLimit";

/**
 * POST /api/payments/jazzcash/webhook
 *
 * JazzCash IPN (Instant Payment Notification) callback endpoint.
 *
 * JazzCash sends an HTTP POST (form-encoded) to this URL after the customer
 * completes or fails a payment on the hosted checkout page.
 *
 * ── IPN VERIFICATION FLOW ────────────────────────────────────────────────────
 *
 * 1. Parse form-encoded body into key-value pairs
 * 2. Verify the pp_SecureHash using plain SHA-256:
 *
 *      expected = SHA256(
 *        MerchantID & Password & TxnRefNo & Amount & DiscountedAmount &
 *        BillReference & Description & Language & MerchantHashedReq &
 *        BankID & ProductID & TxnCurrency & TxnDateTime &
 *        TxnExpiryDateTime & TxnRefNo & TxnType & Version &
 *        SubMerchantID & MerchantHash
 *      )
 *
 *    The fields are joined by "&" (literal ampersand) in the canonical order.
 *    Note: TxnRefNo appears TWICE (positions 3 and 15) per JazzCash spec.
 *
 *    Compare `expected` against pp_SecureHash using constant-time comparison.
 *
 * 3. Look up the order by TxnRefNo (our paymentReference)
 * 4. Verify the amount matches the authoritative order record
 * 5. Process idempotently — duplicate IPNs never double-decrement stock
 *
 * ── SECURITY MODEL ───────────────────────────────────────────────────────────
 *
 * - Never trusts raw query/form parameters for payment decisions
 * - pp_SecureHash verification is the authoritative gate
 * - Amount is cross-checked against the database order record
 * - rateLimitSafe is fail-open (never blocks JazzCash retries)
 * - Processing is idempotent via atomic markOrderPaid transitions
 * - Always responds with JazzCash's expected IPN response format
 * ──────────────────────────────────────────────────────────────────────────────
 */
export async function POST(req: NextRequest) {
  // Fail-open rate limiter — high ceiling for server-to-server webhooks.
  // Signature verification is the real security gate.
  const webhookLimited = rateLimitSafe(req, {
    windowMs: 60_000,
    max: 600,
    label: "jazzcash-webhook",
  });
  if (webhookLimited) return webhookLimited;

  // ── 1. Parse IPN body ──────────────────────────────────────────────
  //
  // JazzCash sends form-encoded data (application/x-www-form-urlencoded)
  // with pp_* prefixed fields.
  const raw = await req.text();
  const params: Record<string, string> = {};
  try {
    const sp = new URLSearchParams(raw);
    sp.forEach((v, k) => {
      params[k] = v;
    });
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ── 2. Verify pp_SecureHash (SHA-256) ──────────────────────────────
  //
  // verifyJazzCashIpn recomputes:
  //   SHA256(MerchantID & Password & TxnRefNo & ... all fields ... & MerchantHash)
  // using the canonical field order, and compares against pp_SecureHash
  // using timingSafeEqual.
  const { valid, status, txnRef } = await verifyJazzCashIpn(params);
  if (!valid) {
    console.error("[JAZZCASH_IPN] Invalid or unverifiable pp_SecureHash");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // ── 3. Look up the order ───────────────────────────────────────────
  //
  // Match by TxnRefNo (our paymentReference stored when initiating payment)
  // or by BillReference (which we set to orderNo).
  const txn = txnRef || params.pp_TxnRefNo || params.pp_BillReference || "";
  if (!txn) {
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { transactionId: txn },
        { paymentReference: params.pp_BillReference || "" },
      ],
    },
  });

  if (!order) {
    console.warn("[JAZZCASH_IPN] No order matched for txn:", txn);
    return NextResponse.json({ ok: true });
  }

  // ── 4. Handle PAID status ──────────────────────────────────────────
  if (status === "PAID") {
    // JazzCash sends amount in paisa (integer). Cross-check against order.
    const reportedAmountPaise = Number(params.pp_Amount) || 0;
    if (!amountMatches(order.total, reportedAmountPaise, order.currency)) {
      console.error(
        "[JAZZCASH_IPN] Amount mismatch:",
        order.orderNo,
        "expected:",
        order.total,
        "received:",
        reportedAmountPaise / 100
      );
      return NextResponse.json({ ok: true });
    }

    // Guard: don't overwrite if already bound to a different transaction
    if (order.transactionId && order.transactionId !== txn) {
      return NextResponse.json({ ok: true });
    }

    // Persist the JazzCash transaction ID if not yet set
    if (!order.transactionId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { transactionId: txn },
      });
    }

    // Atomic, idempotent PAID transition
    const result = await markOrderPaid(order.id);
    if (result.ok && !result.alreadyPaid) {
      await notifyAdmin({
        type: "payment",
        title: "Payment Received (JazzCash)",
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

  // ── 6. JazzCash IPN protocol response ──────────────────────────────
  //
  // JazzCash expects a specific JSON response format. A non-standard
  // response causes JazzCash to retry the IPN (which is safe due to
  // idempotent processing, but we prefer to acknowledge cleanly).
  return NextResponse.json({
    orderRefNumber: txn,
    errorCode: "000",
    description: "request successful",
  });
}
