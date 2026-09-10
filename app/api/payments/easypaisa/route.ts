import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { easypaisaProvider } from "@/lib/payments/easypaisa-provider";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/payments/easypaisa
 *
 * Initiates an Easypaisa payment session for an existing order.
 *
 * This endpoint:
 *  1. Validates the request body
 *  2. Looks up the order in the database
 *  3. Verifies the order is eligible for online payment
 *  4. Calls the Easypaisa provider to build a signed session
 *  5. Persists the transaction reference on the order
 *  6. Returns the redirect URL for the customer
 *
 * SECURITY NOTES:
 *   - Amount is NEVER accepted from the client — it is read from the
 *     authoritative order record in the database.
 *   - The HMAC-SHA256 signature is computed server-side using the secret
 *     hash key, which is never exposed to the client.
 *   - Rate-limited to prevent abuse.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 payment initiation requests per minute per IP
  const limited = rateLimit(req, {
    windowMs: 60_000,
    max: 10,
    label: "easypaisa-init",
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
  if (!easypaisaProvider.configured()) {
    return NextResponse.json(
      { error: easypaisaProvider.unconfiguredReason() },
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
  // Only PENDING orders with online payment providers can proceed.
  // COD orders and already-paid orders are rejected.
  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Order is already paid" },
      { status: 409 }
    );
  }

  if (order.paymentProvider?.toUpperCase() === "COD") {
    return NextResponse.json(
      { error: "Cash on Delivery orders cannot be paid via Easypaisa" },
      { status: 409 }
    );
  }

  // ── 5. Create the Easypaisa payment session ────────────────────────
  //
  // The provider:
  //  - Reads the server-computed amount from the order (not from the request)
  //  - Generates a unique order reference
  //  - Computes HMAC-SHA256(hashKey, storeId + orderId + amount)
  //  - Returns the signed redirect URL
  const session = await easypaisaProvider.createSession({
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
  // This links the Easypaisa order reference to our internal order so
  // the IPN webhook can match it back when the callback arrives.
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentReference: session.reference,
      paymentProvider: "Easypaisa",
    },
  });

  // ── 7. Return the redirect URL ─────────────────────────────────────
  //
  // The client-side checkout will redirect the customer's browser to
  // this URL where they complete the payment on Easypaisa's hosted page.
  return NextResponse.json({
    ok: true,
    redirectUrl: session.redirectUrl,
    reference: session.reference,
    sandbox: session.sandbox,
  });
}
