import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildCustomerList } from "@/lib/customerAdmin";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const status = url.searchParams.get("status") || "All";
    const blockedOnly = url.searchParams.get("blocked") === "true";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit")) || 25));

    let customers = await buildCustomerList();

    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.includes(search) ||
          (c.phone && c.phone.includes(search))
      );
    }

    if (status !== "All") {
      if (status === "Blocked") {
        customers = customers.filter((c) => c.isBlockedEmail || c.accountStatus === "BLOCKED");
      } else if (status === "Guest") {
        customers = customers.filter((c) => !c.hasAccount);
      } else {
        customers = customers.filter((c) => c.accountStatus === status.toUpperCase());
      }
    }

    if (blockedOnly) {
      customers = customers.filter((c) => c.isBlockedEmail);
    }

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.accountStatus === "ACTIVE").length;
    const blockedCount = customers.filter((c) => c.isBlockedEmail).length;
    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const totalOrders = customers.reduce((s, c) => s + c.orders, 0);
    const avgOrderValue =
      totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    const start = (page - 1) * limit;
    const paginated = customers.slice(start, start + limit);

    return NextResponse.json({
      customers: paginated,
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
      },
      stats: {
        totalCustomers,
        activeCustomers,
        blockedCount,
        totalRevenue,
        avgOrderValue,
      },
    });
  } catch (error) {
    console.error("[ADMIN_CUSTOMERS]", error);
    return NextResponse.json(
      {
        customers: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
        stats: {
          totalCustomers: 0,
          activeCustomers: 0,
          blockedCount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        },
      },
      { status: 500 }
    );
  }
}
