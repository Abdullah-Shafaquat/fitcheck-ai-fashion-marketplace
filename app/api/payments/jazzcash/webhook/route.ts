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
 * JazzCash IPN (Instant Payment Notification) callback.
 *
 * SECURITY: This endpoint never trusts raw query/form parameters. It verifies
 * the JazzCash `pp_SecureHash` server-side, matches the merchant transaction
 * reference to an order, and checks the amount/currency against the
 * authoritative order record. Processing is idempotent via the atomic
 * `markOrderPaid` / `setOrderPaymentStatusIfChanged` helpers, so duplicate IPNs
 * never double-decrement stock or double-notify. When credentials are absent,
 * the endpoint is inert but still responds so JazzCash does not retry forever.
 */
export async function POST(req: NextRequest) {
  // Provider webhooks are server-to-server; a browser-style IP limiter must not
  // block legitimate JazzCash retries. rateLimitSafe is a fail-open, fixed-key
  // runaway ceiling only — signature verification below is the authoritative gate.
  const webhookLimited = rateLimitSafe(req, { windowMs: 60_000, max: 600, label: "jazzcash-webhook" });
  if (webhookLimited) return webhookLimited;

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

  // Architecture is gated on credentials; without them we cannot sign/verify.
  const { valid, status, txnRef } = await verifyJazzCashIpn(params);
  if (!valid) {
    console.error("[JAZZCASH_IPN] Invalid or unverifiable callback");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const txn = txnRef || params.pp_TxnRefNo || params.pp_BillReference || "";
  if (!txn) {
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ transactionId: txn }, { paymentReference: params.pp_BillReference || "" }] },
  });
  if (!order) {
    console.warn("[JAZZCASH_IPN] No order matched for txn", txn);
    return NextResponse.json({ ok: true });
  }

  if (status === "PAID") {
    if (!amountMatches(order.total, Number(params.pp_Amount) * 100, order.currency)) {
      console.error("[JAZZCASH_IPN] Amount mismatch", order.orderNo, params.pp_Amount);
      return NextResponse.json({ ok: true });
    }
    if (order.transactionId && order.transactionId !== txn) {
      // Reference already bound to a different txn — do not overwrite settled state.
      return NextResponse.json({ ok: true });
    }
    if (!order.transactionId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { transactionId: txn },
      });
    }
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
  } else {
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

  // JazzCash IPN protocol response.
  return NextResponse.json({
    orderRefNumber: txn,
    errorCode: "000",
    description: "request successful",
  });
}
