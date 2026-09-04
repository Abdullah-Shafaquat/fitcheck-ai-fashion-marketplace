import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/customerAccount";

export interface CustomerSummary {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  provider: string | null;
  accountStatus: string;
  orders: number;
  totalSpent: number;
  joinDate: string;
  lastOrder: string | null;
  lastLoginAt: string | null;
  isBlockedEmail: boolean;
  hasAccount: boolean;
}

export interface OrderStats {
  orders: number;
  totalSpent: number;
  joinDate: string;
  lastOrder: string | null;
}

export async function getOrderStatsByEmail(): Promise<Map<string, OrderStats & { name: string }>> {
  // Aggregate per customer entirely in the DB (GROUP BY email) instead of loading
  // every order row into memory. Order.email is stored normalized at creation, so
  // grouping by email is order-stable. This bounds memory by the number of
  // distinct customers (the list cardinality) rather than the total order count.
  const rows = await prisma.order.groupBy({
    by: ["email"],
    _count: { _all: true },
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true, customer: true },
  });

  const map = new Map<string, OrderStats & { name: string }>();
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    const joinDate = row._min.createdAt;
    const lastOrder = row._max.createdAt;
    map.set(email, {
      name: row._max.customer || email.split("@")[0],
      orders: row._count._all,
      totalSpent: row._sum.total ?? 0,
      joinDate: joinDate ? joinDate.toISOString().slice(0, 10) : "",
      lastOrder: lastOrder ? lastOrder.toISOString().slice(0, 10) : null,
    });
  }

  return map;
}

export async function buildCustomerList(): Promise<CustomerSummary[]> {
  const [users, orderStats, blockedEmails] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    getOrderStatsByEmail(),
    prisma.blockedEmail.findMany({ where: { isActive: true } }),
  ]);

  const blockedSet = new Set(blockedEmails.map((b) => b.email));
  const seen = new Set<string>();
  const customers: CustomerSummary[] = [];

  for (const user of users) {
    const email = normalizeEmail(user.email);
    seen.add(email);
    const stats = orderStats.get(email);
    customers.push({
      id: user.id,
      userId: user.id,
      name: user.name,
      email,
      phone: user.phone,
      image: user.image,
      provider: user.provider,
      accountStatus: user.accountStatus,
      orders: stats?.orders ?? 0,
      totalSpent: Math.round((stats?.totalSpent ?? 0) * 100) / 100,
      joinDate: user.createdAt.toISOString().slice(0, 10),
      lastOrder: stats?.lastOrder ?? null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      isBlockedEmail: blockedSet.has(email) || user.accountStatus === "BLOCKED",
      hasAccount: true,
    });
  }

  for (const [email, stats] of orderStats) {
    if (seen.has(email)) continue;
    customers.push({
      id: `guest:${email}`,
      userId: null,
      name: stats.name,
      email,
      phone: null,
      image: null,
      provider: null,
      accountStatus: blockedSet.has(email) ? "BLOCKED" : "GUEST",
      orders: stats.orders,
      totalSpent: Math.round(stats.totalSpent * 100) / 100,
      joinDate: stats.joinDate,
      lastOrder: stats.lastOrder,
      lastLoginAt: null,
      isBlockedEmail: blockedSet.has(email),
      hasAccount: false,
    });
  }

  customers.sort((a, b) => b.totalSpent - a.totalSpent);
  return customers;
}

export async function resolveCustomerId(id: string): Promise<{
  userId: string | null;
  email: string;
}> {
  if (id.startsWith("guest:")) {
    return { userId: null, email: normalizeEmail(id.slice(6)) };
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Customer not found");
  return { userId: user.id, email: normalizeEmail(user.email) };
}

export async function getCustomerDetail(id: string) {
  const { userId, email } = await resolveCustomerId(id);

  const [user, orders, addresses, blocked, auditLogs] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId } })
      : prisma.user.findUnique({ where: { email } }),
    prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.userAddress.findMany({
      where: { email },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.blockedEmail.findFirst({ where: { email, isActive: true } }),
    prisma.customerAuditLog.findMany({
      where: { targetEmail: email },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const orderStats = orders.reduce(
    (acc, o) => {
      acc.orders += 1;
      acc.totalSpent += o.total;
      return acc;
    },
    { orders: 0, totalSpent: 0 }
  );

  const displayUser = user;
  const name =
    displayUser?.name ||
    orders[0]?.customer ||
    email.split("@")[0];

  return {
    id: displayUser?.id ?? `guest:${email}`,
    userId: displayUser?.id ?? null,
    name,
    email,
    phone: displayUser?.phone ?? orders[0]?.phone ?? null,
    image: displayUser?.image ?? null,
    provider: displayUser?.provider ?? null,
    accountStatus: displayUser?.accountStatus ?? (blocked ? "BLOCKED" : "GUEST"),
    adminNotes: displayUser?.adminNotes ?? null,
    forcePasswordReset: displayUser?.forcePasswordReset ?? false,
    blockedAt: displayUser?.blockedAt?.toISOString() ?? blocked?.blockedAt?.toISOString() ?? null,
    blockedBy: displayUser?.blockedBy ?? blocked?.blockedBy ?? null,
    blockReason: displayUser?.blockReason ?? blocked?.reason ?? null,
    blockReasonDetails:
      displayUser?.blockReasonDetails ?? blocked?.reasonDetails ?? null,
    isBlockedEmail: Boolean(blocked) || displayUser?.accountStatus === "BLOCKED",
    hasAccount: Boolean(displayUser),
    createdAt: displayUser?.createdAt?.toISOString() ?? orders.at(-1)?.createdAt?.toISOString() ?? null,
    updatedAt: displayUser?.updatedAt?.toISOString() ?? null,
    lastLoginAt: displayUser?.lastLoginAt?.toISOString() ?? null,
    deletedAt: displayUser?.deletedAt?.toISOString() ?? null,
    orders: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      expectedDeliveryAt: o.expectedDeliveryAt?.toISOString() ?? null,
      itemCount: Array.isArray(o.items)
        ? (o.items as { quantity?: number }[]).reduce(
            (n, it) => n + (Number(it.quantity) || 1),
            0
          )
        : 0,
    })),
    addresses,
    stats: {
      orders: orderStats.orders,
      totalSpent: Math.round(orderStats.totalSpent * 100) / 100,
    },
    auditLogs: auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      adminId: a.adminId,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
