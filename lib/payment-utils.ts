import { prisma } from "@/lib/prisma";
import {
  appendHistory,
  computeExpectedDeliveryRange,
  normalizeOrderStatus,
  historyToJson,
} from "@/lib/orderWorkflow";

export interface OrderItemRecord {
  productId?: string;
  name?: string;
  slug?: string;
  image?: string;
  price?: number;
  size?: string;
  color?: string;
  sku?: string | null;
  quantity?: number;
  ownerSellerId?: string | null;
  fulfillmentStatus?: string;
}

export interface SerializedOrder {
  id: string;
  orderNo: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  items: OrderItemRecord[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentStatus: string;
  transactionId: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  statusHistory: Array<{
    from: string;
    to: string;
    changedBy: string;
    note?: string;
    at: string;
  }>;
  addressSnapshot: unknown;
  expectedDeliveryAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancellationReasonDetails: string | null;
  refundStatus: string | null;
  refundReason: string | null;
  refundReasonDetails: string | null;
  refundRequestedAt: string | null;
  refundApprovedAt: string | null;
  refundedAt: string | null;
  refundedBy: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shippingMethod: string | null;
  expectedDeliveryEndAt: string | null;
  lastStatusChangeAt: string | null;
  updatedAt: string;
}

export function serializeOrder(order: {
  id: string;
  orderNo: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  items: unknown;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentStatus: string;
  transactionId: string | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  statusHistory?: unknown;
  addressSnapshot?: unknown;
  expectedDeliveryAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationReasonDetails?: string | null;
  refundStatus?: string | null;
  refundReason?: string | null;
  refundReasonDetails?: string | null;
  refundRequestedAt?: Date | null;
  refundApprovedAt?: Date | null;
  refundedAt?: Date | null;
  refundedBy?: string | null;
  trackingNumber?: string | null;
  expectedDeliveryEndAt?: Date | null;
  lastStatusChangeAt?: Date | null;
  updatedAt?: Date;
}): SerializedOrder {
  const items = (Array.isArray(order.items) ? order.items : []) as OrderItemRecord[];
  return {
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    zip: order.zip,
    country: order.country,
    items,
    itemCount: items.reduce((n, it) => n + (Number(it.quantity) || 1), 0),
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    status: normalizeOrderStatus(order.status),
    paymentProvider: order.paymentProvider,
    paymentStatus: order.paymentStatus,
    transactionId: order.transactionId,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    statusHistory: Array.isArray(order.statusHistory)
      ? (order.statusHistory as SerializedOrder["statusHistory"])
      : [],
    addressSnapshot: order.addressSnapshot ?? null,
    expectedDeliveryAt: order.expectedDeliveryAt
      ? order.expectedDeliveryAt.toISOString()
      : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    cancelledBy: order.cancelledBy ?? null,
    cancellationReason: order.cancellationReason ?? null,
    cancellationReasonDetails: order.cancellationReasonDetails ?? null,
    refundStatus: order.refundStatus ?? null,
    refundReason: order.refundReason ?? null,
    refundReasonDetails: order.refundReasonDetails ?? null,
    refundRequestedAt: order.refundRequestedAt
      ? order.refundRequestedAt.toISOString()
      : null,
    refundApprovedAt: order.refundApprovedAt
      ? order.refundApprovedAt.toISOString()
      : null,
    refundedAt: order.refundedAt ? order.refundedAt.toISOString() : null,
    refundedBy: order.refundedBy ?? null,
    trackingNumber: order.trackingNumber ?? null,
    carrier:
      order.addressSnapshot && typeof order.addressSnapshot === "object"
        ? String((order.addressSnapshot as Record<string, unknown>).carrier || "") || null
        : null,
    shippingMethod:
      order.addressSnapshot && typeof order.addressSnapshot === "object"
        ? String((order.addressSnapshot as Record<string, unknown>).shippingMethod || "") || null
        : null,
    expectedDeliveryEndAt: order.expectedDeliveryEndAt
      ? order.expectedDeliveryEndAt.toISOString()
      : null,
    lastStatusChangeAt: order.lastStatusChangeAt
      ? order.lastStatusChangeAt.toISOString()
      : null,
    updatedAt: order.updatedAt
      ? order.updatedAt.toISOString()
      : order.createdAt.toISOString(),
  };
}

export type MarkPaidResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; reason: string };

/**
 * Atomic, idempotent transition of an order to PAID.
 *
 * Guarantees:
 * - Only ever decrements stock and records `paidAt` ONCE, even when called
 *   concurrently (e.g. duplicate/retried webhooks racing with the verify
 *   endpoint). A conditional `updateMany` on `paymentStatus: "PENDING"`
 *   (or "FAILED"/"CANCELLED") wins the race; the loser is a no-op.
 * - The database remains the single source of truth for payment status.
 * - Never trusts caller-supplied state.
 */
export async function markOrderPaid(
  orderId: string,
  opts?: { method?: string; skipStockDecrement?: boolean }
): Promise<MarkPaidResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "Order not found" };
  if (order.paymentStatus === "PAID") return { ok: true, alreadyPaid: true };

  const items = (Array.isArray(order.items) ? order.items : []) as OrderItemRecord[];

  // Reflect the actual method used, when Safepay provides one, for accurate
  // admin/receipt display. Falls back to the neutral "SAFEPAY" provider label.
  const methodLabel = isCodOrder(order)
    ? "Cash on Delivery"
    : opts?.method?.trim()
      ? `Safepay · ${opts.method.trim()}`
      : "SAFEPAY";

  try {
    await prisma.$transaction(async (tx) => {
      // Atomically claim the PAID transition. Only one concurrent caller can
      // flip PENDING -> PAID; everyone else gets count === 0 and skips.
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: { in: ["PENDING", "FAILED", "CANCELLED"] },
        },
        data: { paymentStatus: "PAID", paidAt: new Date(), paymentProvider: methodLabel },
      });
      if (claimed.count === 0) {
        return;
      }

      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (current) {
        const norm = normalizeOrderStatus(current.status);
        const deliveryBase = new Date();
        const { start, end } = computeExpectedDeliveryRange(
          deliveryBase,
          current.country
        );
        if (norm === "Pending") {
          const history = appendHistory(current.statusHistory, {
            from: current.status,
            to: "Confirmed",
            changedBy: "system",
            note: "Payment confirmed",
          });
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: "Confirmed",
              statusHistory: historyToJson(history),
              lastStatusChangeAt: new Date(),
              expectedDeliveryAt: start,
              expectedDeliveryEndAt: end,
            },
          });
        } else if (!current.expectedDeliveryAt) {
          await tx.order.update({
            where: { id: orderId },
            data: {
              expectedDeliveryAt: start,
              expectedDeliveryEndAt: end,
            },
          });
        }
      }

      // COD orders reserve stock at placement, so skip the second decrement.
      // Online pending orders never decremented, so this is their one shot.
      if (opts?.skipStockDecrement || isCodOrder(order)) {
        return;
      }

      for (const item of items) {
        if (!item.productId) continue;
        const qty = Math.floor(Number(item.quantity) || 1);
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (result.count === 0) {
          throw new Error(`Insufficient stock for ${item.name || "an item"} (${item.size || ""}${item.color ? ` / ${item.color}` : ""}).`);
        }
      }
    });
    return { ok: true, alreadyPaid: false };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Could not confirm payment" };
  }
}

export const COD_PROVIDER = "COD";

export const PENDING_CANCEL_MS = 5 * 60 * 1000;

export function isCodOrder(order: {
  paymentProvider: string;
}): boolean {
  return order.paymentProvider.toUpperCase() === COD_PROVIDER;
}

export async function setOrderPaymentStatus(orderId: string, paymentStatus: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus },
  });
}

export async function restoreOrderStock(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return 0;
  const items = (Array.isArray(order.items) ? order.items : []) as OrderItemRecord[];
  let restored = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.productId) continue;
      const qty = Math.floor(Number(item.quantity) || 1);
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      });
      restored += qty;
    }
  });
  return restored;
}

/**
 * Cancels online (non-COD) payment-pending orders whose Safepay session was
 * abandoned for longer than `olderThanMs`. Runs atomically and idempotently:
 * only still-PENDING orders are flipped to CANCELLED, so concurrent calls never
 * double-cancel or double-notify. Online pending orders never had stock
 * decremented, so nothing is restored here. COD orders are excluded — they are
 * paid on delivery, not online.
 */
export async function cancelExpiredPendingOrders(
  olderThanMs = PENDING_CANCEL_MS
): Promise<{
  count: number;
  cancelledOrders: Array<{ id: string; orderNo: string; email: string }>;
}> {
  const since = new Date(Date.now() - olderThanMs);
  const expired = await prisma.order.findMany({
    where: {
      paymentProvider: { not: COD_PROVIDER },
      paymentStatus: "PENDING",
      createdAt: { lt: since },
    },
    select: { id: true, orderNo: true, email: true },
  });

  const cancelledOrders: Array<{ id: string; orderNo: string; email: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const order of expired) {
      const full = await tx.order.findUnique({ where: { id: order.id } });
      if (!full) continue;
      const history = appendHistory(full.statusHistory, {
        from: full.status,
        to: "Cancelled",
        changedBy: "system",
        note: "Payment session expired",
      });
      const claimed = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: "PENDING" },
        data: {
          paymentStatus: "CANCELLED",
          status: "Cancelled",
          cancelledAt: new Date(),
          cancelledBy: "system",
          cancellationReason: "Payment issue",
          cancellationReasonDetails: "Payment session expired before completion.",
          statusHistory: historyToJson(history),
          lastStatusChangeAt: new Date(),
        },
      });
      if (claimed.count === 1) {
        cancelledOrders.push(order);
      }
    }
  });

  return { count: cancelledOrders.length, cancelledOrders };
}

/**
 * Transitions an order to a terminal payment status, but ONLY if it is
 * currently not already PAID nor already in the target status. Returns the
 * updated order and whether an actual transition occurred. This makes
 * failed/cancelled updates idempotent so retried callbacks never re-send
 * duplicate notifications or re-run side effects.
 */
export async function setOrderPaymentStatusIfChanged(
  orderId: string,
  paymentStatus: "FAILED" | "CANCELLED" | "PENDING"
): Promise<{ order: Awaited<ReturnType<typeof prisma.order.findUnique>>; changed: boolean }> {
  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (!current) return { order: null, changed: false };

  // Never downgrade a settled/paid order, and avoid redundant updates.
  if (current.paymentStatus === "PAID" || current.paymentStatus === paymentStatus) {
    return { order: current, changed: false };
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus },
  });
  return { order: updated, changed: true };
}

export function amountMatches(orderTotal: number, quoteAmount: number, currency: string): boolean {
  return (
    currency.toUpperCase() === "PKR" &&
    Math.round(orderTotal * 100) === Math.round(Number(quoteAmount))
  );
}

export interface OrderLookupKey {
  orderNo?: string;
  tracker?: string;
}

export function parseOrderLookup(raw: string): OrderLookupKey {
  const clean = (String(raw || "").trim()).split(/[?&#]/)[0].trim();
  const orderNo = clean || undefined;

  let tracker: string | undefined;
  const all = String(raw || "").split(/[?&#]/);
  for (const part of all) {
    if (!part) continue;
    const [k, ...rest] = part.split("=");
    if (k === "tracker" && rest.length) {
      tracker = rest.join("=").trim() || undefined;
    }
  }
  return { orderNo, tracker };
}

export async function findOrderByLookupKey(key: OrderLookupKey) {
  const orderNo = key.orderNo ? key.orderNo.trim() : "";
  if (orderNo) {
    const direct = await prisma.order.findUnique({ where: { orderNo } });
    if (direct) return direct;
    const ci = await prisma.order.findFirst({
      where: { orderNo: { in: [orderNo.toUpperCase(), orderNo.toLowerCase()] } },
    });
    if (ci) return ci;
  }
  if (key.tracker) {
    const byTracker = await prisma.order.findFirst({
      where: { transactionId: key.tracker.trim() },
    });
    if (byTracker) return byTracker;
  }
  return null;
}