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
 * Easypaisa callback.

 * SECURITY: like the JazzCash IPN, this never trusts raw query/form fields. It
 * verifies the provider signature server-side, matches the transaction to an
 * order, checks the amount/currency against the authoritative record, and
 * processes idempotently. When credentials are absent, the endpoint is inert.
 */
export async function POST(req: NextRequest) {
  // Provider webhooks are server-to-server; a browser-style IP limiter must not
  // block legitimate Easypaisa retries. rateLimitSafe is a fail-open, fixed-key
  // runaway ceiling only — signature verification below is the authoritative gate.
  const webhookLimited = rateLimitSafe(req, { windowMs: 60_000, max: 600, label: "easypaisa-webhook" });
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

  const { valid, status, txn } = await verifyEasypaisaCallback(params);
  if (!valid) {
    console.error("[EASYPAISA_CB] Invalid or unverifiable callback");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!txn) {
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ transactionId: txn }, { paymentReference: txn }] },
  });
  if (!order) {
    console.warn("[EASYPAISA_CB] No order matched for txn", txn);
    return NextResponse.json({ ok: true });
  }

  if (status === "PAID") {
    const reportedAmount = Number(params.amount) || Number(params.transactionAmount) || 0;
    if (!amountMatches(order.total, reportedAmount * 100, order.currency)) {
      console.error("[EASYPAISA_CB] Amount mismatch", order.orderNo, reportedAmount);
      return NextResponse.json({ ok: true });
    }
    if (order.transactionId && order.transactionId !== txn) {
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
  } else if (status === "FAILED") {
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

  return NextResponse.json({ ok: true });
}
