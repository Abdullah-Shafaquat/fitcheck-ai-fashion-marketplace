import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OrderItemRecord } from "@/lib/payment-utils";
import { normalizeOrderStatus } from "@/lib/orderWorkflow";
import { notifySeller } from "@/lib/sellerNotifications";

export async function notifySellersForNewOrder(order: { orderNo: string; total: number; items: unknown }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const sellerIds = [
    ...new Set(items.map((it: any) => it?.ownerSellerId).filter(Boolean)),
  ] as string[];
  for (const sellerId of sellerIds) {
    await notifySeller(sellerId, {
      type: "order",
      title: "New Order",
      message: `You have a new order #${order.orderNo} totaling Rs ${(order.total || 0).toLocaleString()}.`,
      link: "/seller/orders",
    });
  }
}


/**
 * Order items are stored as a JSON blob on Order.items. For multi-vendor
 * support, each item record embeds the owning seller id (ownerSellerId) at
 * order-creation time. These helpers resolve seller-level views of orders.
 */

export interface SellerOrderItemView extends OrderItemRecord {
  ownerSellerId?: string | null;
  orderId: string;
  orderNo: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

export function getSellerItemsFromOrder(
  order: { id: string; orderNo: string; status: string; paymentStatus: string; createdAt: Date | string },
  sellerId: string
): SellerOrderItemView[] {
  const items = (Array.isArray((order as any).items) ? (order as any).items : []) as OrderItemRecord[];
  const sellerItems: SellerOrderItemView[] = [];
  for (const it of items) {
    const owner = it ? (it as any).ownerSellerId : null;
    if (owner && String(owner) === sellerId) {
      sellerItems.push({
        ...it,
        ownerSellerId: owner,
        orderId: order.id,
        orderNo: order.orderNo,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: new Date(order.createdAt).toISOString(),
      });
    }
  }
  return sellerItems;
}

export async function getSellerOrders(
  sellerId: string,
  limit = 200,
  options?: { page?: number; pageSize?: number; status?: string; search?: string }
) {
  const page = options?.page != null && Number.isFinite(options.page) && options.page >= 1 ? Math.floor(options.page) : 1;
  const pageSize = options?.pageSize != null && Number.isFinite(options.pageSize) && options.pageSize >= 1 ? Math.min(Math.floor(options.pageSize), 200) : undefined;
  const take = pageSize ?? limit;
  const skip = pageSize ? (page - 1) * pageSize : 0;

  // Ownership is enforced in the database: only orders containing at least one
  // item whose ownerSellerId matches the caller are selected (JSONB containment).
  // Ordering is deterministic (createdAt desc, id desc) so pagination is stable.
  const whereSql = Prisma.sql`
    "items"::jsonb @> jsonb_build_array(jsonb_build_object('ownerSellerId', ${sellerId}))
    ${options?.status && options.status !== "All" ? Prisma.sql`AND "status" = ${options.status}` : Prisma.empty}
    ${options?.search ? Prisma.sql`AND ("orderNo" ILIKE ${`%${options.search}%`} OR "customer" ILIKE ${`%${options.search}%`})` : Prisma.empty}
  `;

  const [orderRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; orderNo: string; status: string; paymentStatus: string; createdAt: Date; items: unknown; customer: string | null; email: string | null; total: number; addressSnapshot: unknown }>>(Prisma.sql`
      SELECT "id", "orderNo", "status", "paymentStatus", "createdAt", "items", "customer", "email", "total", "addressSnapshot"
      FROM "Order"
      WHERE ${whereSql}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${take} OFFSET ${skip}
    `),
  ]);

  const out: Array<{ orderId: string; orderNo: string; orderStatus: string; paymentStatus: string; createdAt: string; customer: string; email: string; total: number; addressSnapshot: unknown; items: SellerOrderItemView[] }> = [];
  for (const o of orderRows) {
    const items = getSellerItemsFromOrder(o as any, sellerId);
    if (items.length) {
      out.push({
        orderId: o.id,
        orderNo: o.orderNo,
        orderStatus: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: new Date(o.createdAt).toISOString(),
        customer: (o as any).customer,
        email: (o as any).email,
        total: (o as any).total,
        addressSnapshot: (o as any).addressSnapshot,
        items,
      });
    }
  }
  return out;
}

export async function countSellerOrders(
  sellerId: string,
  options?: { status?: string; search?: string }
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*)::int8 AS "total"
    FROM "Order"
    WHERE "items"::jsonb @> jsonb_build_array(jsonb_build_object('ownerSellerId', ${sellerId}))
      ${options?.status && options.status !== "All" ? Prisma.sql`AND "status" = ${options.status}` : Prisma.empty}
      ${options?.search ? Prisma.sql`AND ("orderNo" ILIKE ${`%${options.search}%`} OR "customer" ILIKE ${`%${options.search}%`})` : Prisma.empty}
  `);
  return Number(rows[0]?.total ?? 0);
}

export async function getSellerOrder(id: string, sellerId: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return null;
  const items = getSellerItemsFromOrder(order as any, sellerId);
  if (!items.length) return null;
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: new Date(order.createdAt).toISOString(),
    customer: order.customer,
    email: order.email,
    total: order.total,
    addressSnapshot: order.addressSnapshot,
    trackingNumber: order.trackingNumber,
    items,
  };
}

export async function getSellerDashboardStats(sellerId: string) {
  const sellerOrders = await getSellerOrders(sellerId, 1000);
  const counts: Record<string, number> = {};
  let totalSales = 0;
  let totalUnits = 0;
  let pendingOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let refundedOrders = 0;
  let soldAmount = 0;

  for (const so of sellerOrders) {
    const status = normalizeOrderStatus(so.orderStatus);
    counts[status] = (counts[status] || 0) + 1;
    const qty = so.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    totalUnits += qty;
    totalSales += Number(so.total) || 0;

    if (status === "Pending" || status === "Confirmed") pendingOrders++;
    else if (status === "Processing" || status === "Packed") processingOrders++;
    else if (status === "Shipped") shippedOrders++;
    else if (status === "Out for Delivery") shippedOrders++;
    else if (status === "Delivered") {
      deliveredOrders++;
      soldAmount += Number(so.total) || 0;
    } else if (status === "Cancelled" || status === "Cancel Requested") cancelledOrders++;
    else if (status === "Refunded" || status === "Refund Requested" || status === "Refund Approved" || status === "Refund Rejected") refundedOrders++;
  }

  // Top selling products
  const productTally: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const so of sellerOrders) {
    for (const it of so.items) {
      const key = String(it.name || it.productId || "unknown");
      productTally[key] = productTally[key] || { name: it.name || "Product", qty: 0, revenue: 0 };
      productTally[key].qty += Number(it.quantity) || 1;
      productTally[key].revenue += (Number(it.price) || 0) * (Number(it.quantity) || 1);
    }
  }
  const topProducts = Object.values(productTally)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return {
    totalOrders: sellerOrders.length,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    refundedOrders,
    totalSales,
    totalUnits,
    soldAmount,
    topProducts,
    counts,
  };
}
