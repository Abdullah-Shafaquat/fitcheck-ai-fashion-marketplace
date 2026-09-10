import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jazzcashProvider } from "@/lib/payments/jazzcash-provider";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/payments/jazzcash
 *
 * Initiates a JazzCash payment session for an existing order.
 *
 * This endpoint:
 *  1. Validates the request body
 *  2. Looks up the order in the database
 *  3. Verifies the order is eligible for online payment
 *  4. Calls the JazzCash provider to build a signed session
 *  5. Persists the transaction reference on the order
 *  6. Returns the redirect URL for the customer
 *
 * SECURITY NOTES:
 *   - Amount is NEVER accepted from the client — read from the DB.
 *   - Both hash layers (pp_MerchantHashedReq + pp_SecureHash) are
 *     computed server-side. The salt key and password are never exposed.
 *   - Rate-limited to prevent abuse.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 payment initiation requests per minute per IP
  const limited = rateLimit(req, {
    windowMs: 60_000,
    max: 10,
    label: "jazzcash-init",
  });
  if (limited) return limited;

  // ── 1. Parse and validate request body ──────────────────────────────
  let body: {
    orderId?: string;
    mobileNo?: string;
    email?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 }
    );
  }

  // ── 2. Check provider availability ─────────────────────────────────
  if (!jazzcashProvider.configured()) {
    return NextResponse.json(
      { error: jazzcashProvider.unconfiguredReason() },
      { status: 503 }
    );
  }

  // ── 3. Look up the order ───────────────────────────────────────────
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // ── 4. Verify order is eligible for online payment ─────────────────
  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Order is already paid" },
      { status: 409 }
    );
  }

  if (order.paymentProvider?.toUpperCase() === "COD") {
    return NextResponse.json(
      { error: "Cash on Delivery orders cannot be paid via JazzCash" },
      { status: 409 }
    );
  }

  // ── 5. Create the JazzCash payment session ──────────────────────────
  //
  // The provider:
  //  - Reads the server-computed amount from the order
  //  - Generates a unique transaction reference
  //  - Computes Layer 1: HMAC-SHA256(saltKey, MerchantID & Password & TxnRefNo)
  //  - Computes Layer 2: SHA256(all fields joined by "&")
  //  - Returns the signed redirect URL
  const session = await jazzcashProvider.createSession({
    orderId: order.id,
    orderNo: order.orderNo,
    amount: order.total,           // Server-computed amount — never client-supplied
    successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
    cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/cart`,
    metadata: {
      mobileNo: body.mobileNo || "",
      email: body.email || order.email,
    },
  });

  // ── 6. Persist the transaction reference on the order ───────────────
  //
  // This links the JazzCash transaction reference to our internal order
  // so the IPN callback can match it when the webhook arrives.
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentReference: session.reference,
      paymentProvider: "JazzCash",
    },
  });

  // ── 7. Return the redirect URL ─────────────────────────────────────
  //
  // The client-side checkout redirects the customer to JazzCash's
  // hosted checkout page where they complete the payment.
  return NextResponse.json({
    ok: true,
    redirectUrl: session.redirectUrl,
    reference: session.reference,
    sandbox: session.sandbox,
  });
}
