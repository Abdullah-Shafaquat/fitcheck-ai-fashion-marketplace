import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeOrder,
  OrderItemRecord,
  COD_PROVIDER,
} from "@/lib/payment-utils";
import { getPaymentProvider, PaymentProviderId } from "@/lib/payments";
import {
  computeShippingCost,
  getShippingConfig,
} from "@/lib/shipping/methods";
import { notifyAdmin, notifyCustomer } from "@/lib/notify";
import {
  computeExpectedDeliveryRange,
  appendHistory,
  historyToJson,
} from "@/lib/orderWorkflow";
import {
  assertCanPlaceOrder,
  normalizeEmail,
  isValidEmail,
  isValidPhone,
} from "@/lib/customerAccount";
import { notifySellersForNewOrder } from "@/lib/sellerOrders";
import { requireCustomer } from "@/lib/customer-auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

async function computeShipping(subtotal: number, methodId: unknown): Promise<{ cost: number; method: string | null }> {
  // Server-authoritative shipping cost. Standard flat cost is the default for
  // backward compatibility; an explicit shippingMethod routes through the
  // shipping-methods module so costs and delivery estimates stay server-side.
  const res = await computeShippingCost(String(methodId || ""), subtotal);
  if (res.ok) return { cost: res.cost, method: res.method.id };
  const cfg = await getShippingConfig();
  const { freeShippingThreshold, standardShipping } = cfg;
  return {
    cost: subtotal >= freeShippingThreshold ? 0 : standardShipping,
    method: null,
  };
}

function normalizeOrderNo(): string {
  return `FC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}

function baseUrl(req: NextRequest): string {
  return (
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

async function buildPaymentSessionForOrder(
  orderId: string,
  orderNo: string,
  total: number,
  providerId: PaymentProviderId,
  req: NextRequest
) {
  // Route through the unified payment provider layer. The authoritative total is
  // passed here (never client-supplied) and the provider returns the redirect.
  const provider = getPaymentProvider(providerId);
  if (!provider) {
    throw new Error("Unknown payment provider.");
  }
  const session = await provider.createSession({
    orderId,
    orderNo,
    amount: total,
    currency: "PKR",
    metadata: { order_id: orderNo },
    successUrl: `${baseUrl(req)}/checkout/success?order=${encodeURIComponent(orderNo)}`,
    cancelUrl: `${baseUrl(req)}/checkout/failed?order=${encodeURIComponent(orderNo)}`,
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { transactionId: session.reference },
  });
  return session.redirectUrl;
}

// Whether the given online provider is available to create sessions.
function onlineProviderReady(providerId: PaymentProviderId): boolean {
  return Boolean(getPaymentProvider(providerId)?.configured());
}

// Payment method string -> provider id. "cod" is handled separately.
function providerIdForPaymentMethod(paymentMethod: unknown): PaymentProviderId | null {
  const method = String(paymentMethod || "")
    .trim()
    .toLowerCase();
  if (method === "online" || method === "safepay") return "safepay";
  if (method === "jazzcash") return "jazzcash";
  if (method === "easypaisa") return "easypaisa";
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req);
  if (auth.response) return auth.response;
  const email = auth.user.email as string;
  try {
    const orders = await prisma.order.findMany({
      where: { email: email.trim().toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error("Error fetching orders by email:", error);
    return NextResponse.json({ error: "Failed to fetch orders", orders: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const shippingInfo = body.shippingInfo || {};
    if (
      !shippingInfo.firstName ||
      !shippingInfo.email ||
      !shippingInfo.address
    ) {
      return NextResponse.json(
        { error: "Shipping information is incomplete" },
        { status: 400 }
      );
    }

    const checkoutEmail = normalizeEmail(String(shippingInfo.email));
    if (!isValidEmail(checkoutEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const checkoutPhone = String(shippingInfo.phone || "").trim();
    if (!isValidPhone(checkoutPhone)) {
      return NextResponse.json(
        { error: "A valid phone number is required for delivery." },
        { status: 400 }
      );
    }

    const orderBlock = await assertCanPlaceOrder(checkoutEmail);
    if (orderBlock) {
      return NextResponse.json({ error: orderBlock }, { status: 403 });
    }

    // Abuse protection for order creation. Keyed on the safe proxy-aware client
    // IP combined with the (validated) checkout email — never on a random client
    // header alone — so rapid repeat placement is throttled without blocking
    // normal checkout. Business-level auth, stock, price and idempotency checks
    // remain untouched and authoritative.
    const rateKey = `${getClientIp(req)}|${checkoutEmail}`;
    const limited = rateLimit(req, {
      windowMs: 10 * 60_000,
      max: 30,
      label: "orders",
      key: rateKey,
    });
    if (limited) return limited;

    const clientRef =
      typeof body.clientRef === "string" && body.clientRef.trim()
        ? body.clientRef.trim().slice(0, 64)
        : null;

    const isCod = body.paymentMethod === "cod" || body.cod === true;

    // JazzCash / Easypaisa are config-gated. Resolve the chosen method to a
    // provider; validate it is actually configured before creating an order so
    // we never write an order we cannot process. Customers are only directed to
    // these hosted flows when merchant credentials are present in the env.
    const providerId = providerIdForPaymentMethod(body.paymentMethod);
    if (providerId && !onlineProviderReady(providerId)) {
      return NextResponse.json(
        {
          error:
            "That payment method is not available right now. Please use the online Safepay checkout or Cash on Delivery.",
        },
        { status: 400 }
      );
    }

    const ALLOWED_PAYMENT_METHODS = ["online", "cod", "safepay", "jazzcash", "easypaisa"];
    if (!ALLOWED_PAYMENT_METHODS.includes(String(body.paymentMethod || ""))) {
      return NextResponse.json(
        { error: "Unsupported payment method." },
        { status: 400 }
      );
    }

    const customer = `${shippingInfo.firstName} ${shippingInfo.lastName || ""}`.trim();

    const productIds = [
      ...new Set(
        rawItems
          .map((it: unknown) => {
            const item = it as Record<string, unknown> | null | undefined;
            return String(item?.productId || "");
          })
          .filter(Boolean)
      ),
    ];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        OR: [{ productOwnerType: "PLATFORM" }, { approvalStatus: "APPROVED" }],
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items: OrderItemRecord[] = [];
    for (const raw of rawItems) {
      const it = (raw || {}) as Record<string, unknown>;
      const productId = String(it.productId || "");
      const product = productMap.get(productId);

      if (!product) {
        return NextResponse.json(
          { error: "An item in your cart is no longer available." },
          { status: 400 }
        );
      }
      if (!product.isActive) {
        return NextResponse.json(
          { error: `${product.name} is no longer available.` },
          { status: 400 }
        );
      }

      const size = String(it.size || "").trim();
      const color = String(it.color || "").trim();
      const quantity = Math.floor(Number(it.quantity) || 0);

      if (quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid quantity for an item in your cart." },
          { status: 400 }
        );
      }
      if (
        product.sizes.length > 0 &&
        size &&
        !product.sizes.includes(size)
      ) {
        return NextResponse.json(
          { error: `${product.name} size "${size}" is not available.` },
          { status: 400 }
        );
      }
      if (
        product.colors.length > 0 &&
        color &&
        !product.colors.some((c) => c.toLowerCase() === color.toLowerCase())
      ) {
        return NextResponse.json(
          { error: `${product.name} color "${color}" is not available.` },
          { status: 400 }
        );
      }
      if (quantity > product.stock) {
        return NextResponse.json(
          {
            error: `Only ${product.stock} left in stock for ${product.name}${size ? ` (${size})` : ""}${color ? ` (${color})` : ""}. Please update your cart.`,
          },
          { status: 400 }
        );
      }

      items.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: String(it.image || ""),
        price: product.price,
        size,
        color,
        sku: product.sku,
        quantity,
        ownerSellerId: product.sellerId || null,
      });
    }

    const subtotal = items.reduce(
      (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
      0
    );
    const { cost: shipping, method: shippingMethod } = await computeShipping(
      subtotal,
      body.shippingMethod
    );
    const discount = 0;
    const total = subtotal + shipping - discount;

    const orderNo = normalizeOrderNo();

    // Online orders get deterministically reused (by clientRef) when retried
    // with the identical cart. COD orders are confirmed immediately and are
    // never reused/merged, so each placement is its own distinct order.
    if (clientRef && !isCod) {
      const existing = await prisma.order.findUnique({
        where: { clientRef },
      });
      if (existing) {
        // An order that was actually paid (or refunded) is terminal — never let
        // the same cart be charged twice. Otherwise the order is retryable: a
        // pending, failed or expired/cancelled session is safely re-armed for a
        // fresh payment attempt.
        if (existing.paymentStatus === "PAID" || existing.paymentStatus === "REFUNDED") {
          return NextResponse.json(
            {
              error: "This order was already paid and cannot be paid again.",
              order: serializeOrder(existing),
              checkoutUrl: null,
            },
            { status: 200 }
          );
        }

        // clientRef is derived only from the cart contents, so rebuild the
        // session with the payment method the customer selected this time.
        let order = existing;
        if (existing.paymentStatus !== "PENDING") {
          order = await prisma.order.update({
            where: { id: existing.id },
            data: {
              paymentProvider: providerId!.toUpperCase(),
              paymentStatus: "PENDING",
              status: "Pending",
              transactionId: null,
              cancelledAt: null,
              cancelledBy: null,
              cancellationReason: null,
              cancellationReasonDetails: null,
              lastStatusChangeAt: new Date(),
              statusHistory: historyToJson(
                appendHistory(existing.statusHistory, {
                  from: existing.status,
                  to: "Pending",
                  changedBy: "system",
                  note: "Order reopened for a new payment attempt.",
                })
              ),
            },
          });
        } else if (existing.paymentProvider.toUpperCase() !== providerId!.toUpperCase()) {
          order = await prisma.order.update({
            where: { id: existing.id },
            data: {
              paymentProvider: providerId!.toUpperCase(),
              statusHistory: historyToJson(
                appendHistory(existing.statusHistory, {
                  from: existing.status,
                  to: existing.status,
                  changedBy: "system",
                  note: `Payment method set to ${providerId}.`,
                })
              ),
            },
          });
        }

        try {
          const checkoutUrl = await buildPaymentSessionForOrder(
            order.id,
            order.orderNo,
            order.total,
            providerId!,
            req
          );
          return NextResponse.json(
            { order: serializeOrder(order), checkoutUrl },
            { status: 201 }
          );
        } catch (error) {
          console.error("Payment session creation failed (reuse):", error);
          return NextResponse.json(
            {
              error: `Payment could not be started. Your order #${order.orderNo} was saved. Please contact support or try again later.`,
              order: serializeOrder(order),
              checkoutUrl: null,
            },
            { status: 502 }
          );
        }
      }
    }

    let order;
    try {
      const snapshot = {
        label: String(shippingInfo.label || "Home"),
        fullName: customer,
        phone: String(shippingInfo.phone || ""),
        line1: String(shippingInfo.address || ""),
        line2: String(shippingInfo.line2 || ""),
        area: String(shippingInfo.area || ""),
        city: String(shippingInfo.city || ""),
        province: String(shippingInfo.province || shippingInfo.state || ""),
        postalCode: String(shippingInfo.zip || ""),
        country: String(shippingInfo.country || "Pakistan"),
        shippingMethod: shippingMethod ?? "standard",
      };
      const initialStatus = isCod ? "Confirmed" : "Pending";
      const deliveryBase = new Date();
      const { start, end } = computeExpectedDeliveryRange(
        deliveryBase,
        snapshot.country
      );
      const initialHistory = appendHistory([], {
        from: "",
        to: initialStatus,
        changedBy: "system",
        note: isCod ? "Order placed (Cash on Delivery)" : "Order placed",
      });
      order = await prisma.order.create({
        data: {
          orderNo,
          clientRef: isCod ? null : clientRef,
          customer,
          email: shippingInfo.email.trim().toLowerCase(),
          phone: String(shippingInfo.phone || ""),
          address: String(shippingInfo.address || ""),
          city: String(shippingInfo.city || ""),
          zip: String(shippingInfo.zip || ""),
          country: String(shippingInfo.country || "Pakistan"),
          items: JSON.parse(JSON.stringify(items)),
          subtotal,
          shipping,
          discount,
          total,
          currency: "PKR",
          status: initialStatus,
          paymentProvider: isCod
            ? COD_PROVIDER
            : (providerId || "safepay").toUpperCase(),
          paymentStatus: "PENDING",
          paymentReference: orderNo,
          statusHistory: historyToJson(initialHistory),
          addressSnapshot: JSON.parse(JSON.stringify(snapshot)),
          expectedDeliveryAt: start,
          expectedDeliveryEndAt: end,
          lastStatusChangeAt: new Date(),
        },
      });
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === "P2002" && clientRef && !isCod) {
        const existing = await prisma.order.findUnique({
          where: { clientRef },
        });
        if (existing) {
          try {
            const checkoutUrl = await buildPaymentSessionForOrder(
              existing.id,
              existing.orderNo,
              existing.total,
              providerId || "safepay",
              req
            );
            return NextResponse.json(
              { order: serializeOrder(existing), checkoutUrl },
              { status: 201 }
            );
          } catch (error) {
            console.error("Payment session creation failed (race):", error);
            return NextResponse.json(
              {
                error: `Payment could not be started. Your order #${existing.orderNo} was saved. Please contact support or try again later.`,
                order: serializeOrder(existing),
                checkoutUrl: null,
              },
              { status: 502 }
            );
          }
        }
      }
      throw error;
    }

    // COD: reserve stock at placement (available-checked) so the quantities are
    // held for delivery. Payment is collected and confirmed later by an admin.
    if (isCod) {
      let reservationError: string | null = null;
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of items) {
            if (!item.productId) continue;
            const qty = Math.floor(Number(item.quantity) || 1);
            const result = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: qty } },
              data: { stock: { decrement: qty } },
            });
            if (result.count === 0) {
              throw new Error(
                `Only a limited quantity is left in stock for ${item.name || "an item"}.`
              );
            }
          }
        });
      } catch (error) {
        reservationError =
          error instanceof Error ? error.message : "Insufficient stock for an item in the order.";
        // Roll back the unfulfillable order.
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "CANCELLED", status: "Cancelled" },
        });
      }
      if (reservationError) {
        return NextResponse.json(
          { error: reservationError, order: serializeOrder(order), checkoutUrl: null },
          { status: 409 }
        );
      }

      await notifyAdmin({
        type: "order",
        title: "New Order (Cash on Delivery)",
        message: `Order #${order.orderNo} — Rs ${order.total.toLocaleString()} (COD).`,
        link: `/admin/orders`,
      });
      await notifyCustomer(order.email, {
        type: "order",
        title: "Order Placed Successfully",
        message: `Your order #${order.orderNo} has been confirmed. Pay Rs ${order.total.toLocaleString()} on delivery.`,
        link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
      });
      await notifySellersForNewOrder(order as any);
      return NextResponse.json(
        {
          order: serializeOrder(order),
          checkoutUrl: null,
          cod: true,
          orderUrl: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
        },
        { status: 201 }
      );
    }

    if (!onlineProviderReady(providerId || "safepay")) {
      await notifyAdmin({
        type: "order",
        title: "New Order Received",
        message: `Order #${order.orderNo} — Rs ${order.total.toLocaleString()}`,
        link: `/admin/orders`,
      });
      await notifyCustomer(order.email, {
        type: "order",
        title: "Order Placed Successfully",
        message: `Your order #${order.orderNo} has been received.`,
        link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
      });
      await notifySellersForNewOrder(order as any);
      return NextResponse.json(
        {
          error:
            "Payments are unavailable right now. Your order was saved — please contact support to complete it.",
          order: serializeOrder(order),
          checkoutUrl: null,
        },
        { status: 502 }
      );
    }

    try {
      const checkoutUrl = await buildPaymentSessionForOrder(
        order.id,
        order.orderNo,
        order.total,
        providerId || "safepay",
        req
      );
      await notifyAdmin({
        type: "order",
        title: "New Order Received",
        message: `Order #${order.orderNo} — Rs ${order.total.toLocaleString()}`,
        link: `/admin/orders`,
      });
      await notifyCustomer(order.email, {
        type: "order",
        title: "Order Placed Successfully",
        message: `Your order #${order.orderNo} has been received.`,
        link: `/orders/${order.orderNo}?email=${encodeURIComponent(order.email)}`,
      });
      await notifySellersForNewOrder(order as any);
      return NextResponse.json(
        { order: serializeOrder(order), checkoutUrl },
        { status: 201 }
      );
    } catch (error) {
      console.error("Payment session creation failed:", error);
      return NextResponse.json(
        {
          error: `Payment could not be started. Your order #${order.orderNo} was saved. Please contact support or try again later.`,
          order: serializeOrder(order),
          checkoutUrl: null,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}
