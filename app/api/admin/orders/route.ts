import { NextRequest, NextResponse } from "next/server";
import { prismaQuery } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { cancelExpiredPendingOrders, serializeOrder } from "@/lib/payment-utils";
import { notifyCustomer } from "@/lib/notify";

const emptyStats = {
  orders: [],
  stats: { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, deliveredOrders: 0 },
  source: "empty",
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;

const PENDING_STATUS_SET = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Cancel Requested",
];

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    // Auto-cancel online payments that were started but abandoned for >5 min.
    // Idempotent — only still-PENDING orders are flipped, so doesn't re-fire.
    const { cancelledOrders } = await cancelExpiredPendingOrders();

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const status = url.searchParams.get("status") || "All";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(MIN_PAGE_SIZE, Number(url.searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
    );

    // Server-side where clause mirroring the previous client-side search/status
    // filters, so pagination operates on the DB and never loads the full table.
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: "insensitive" } },
        { customer: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status !== "All") {
      where.status = { in: [status], mode: "insensitive" };
    }

    const result = await prismaQuery(async (p) => {
      // Global stats are computed over ALL orders (DB-side), independent of the
      // current page/filter, preserving the previous stat-card semantics.
      const [totalFiltered, totalOrders, totalRevenueAgg, pendingOrders, deliveredOrders, orders] =
        await Promise.all([
          p.order.count({ where }),
          p.order.count(),
          p.order.aggregate({
            where: { paymentStatus: "PAID" },
            _sum: { total: true },
          }),
          p.order.count({
            where: { status: { in: PENDING_STATUS_SET, mode: "insensitive" } },
          }),
          p.order.count({
            where: { status: { equals: "Delivered", mode: "insensitive" } },
          }),
          p.order.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ]);

      const serialized = orders.map((o) => {
        const base = serializeOrder(o);
        return {
          ...base,
          date: o.createdAt.toISOString(),
        };
      });

      return {
        orders: serialized,
        stats: {
          totalOrders,
          totalRevenue: totalRevenueAgg._sum.total ?? 0,
          pendingOrders,
          deliveredOrders,
        },
        source: "database",
        pagination: {
          page,
          pageSize,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / pageSize),
        },
      };
    });

    for (const o of cancelledOrders) {
      try {
        await notifyCustomer(o.email, {
          type: "order",
          title: "Payment Expired — Order Cancelled",
          message:
            `Your payment session for order #${o.orderNo} expired before payment was completed, ` +
            `so the order was cancelled. Please place the order again to continue.`,
          link: "/cart",
        });
      } catch {
        // notification failures shouldn't block the admin view
      }
    }

    return NextResponse.json({ ...result, cancelledCount: cancelledOrders.length });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json(emptyStats);
  }
}