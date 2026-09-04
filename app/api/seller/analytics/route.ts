import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { getSellerDashboardStats, getSellerOrders } from "@/lib/sellerOrders";
import { getSellerEarningsStatements, reconcilePendingToAvailable } from "@/lib/sellerEarnings";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  await reconcilePendingToAvailable(auth.seller.id);

  const seller = await prisma.sellerProfile.findUnique({ where: { id: auth.seller.id } });
  const stats = await getSellerDashboardStats(auth.seller.id);
  const statements = await getSellerEarningsStatements(auth.seller.id);
  const sellerOrders = await getSellerOrders(auth.seller.id, 1000);

  const daily: Record<string, { date: string; sales: number; units: number; orders: number }> = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily[key] = { date: key, sales: 0, units: 0, orders: 0 };
  }
  let totalUnits = 0;
  let totalRevenue = 0;
  const orderSet = new Set<string>();
  for (const so of sellerOrders) {
    const key = so.createdAt.slice(0, 10);
    const amount = Number((so as any).total || 0);
    if (daily[key]) {
      daily[key].sales += amount;
      daily[key].units += so.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
      if (!orderSet.has(so.orderNo)) {
        daily[key].orders += 1;
        orderSet.add(so.orderNo);
      }
    }
    totalUnits += so.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    totalRevenue += amount;
  }

  const avgOrderValue = stats.totalOrders ? stats.totalSales / stats.totalOrders : 0;
  const netEarnings = statements.filter((s) => s.net > 0).reduce((s, e) => s + e.net, 0);

  return NextResponse.json({
    seller: {
      storeName: seller?.storeName,
      availableBalance: seller?.availableBalance ?? 0,
      pendingBalance: seller?.pendingBalance ?? 0,
      totalEarnings: seller?.totalEarnings ?? 0,
      totalPaidOut: seller?.totalPaidOut ?? 0,
    },
    stats,
    daily: Object.values(daily),
    totals: {
      totalOrders: stats.totalOrders,
      totalUnits,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100,
    },
  });
}
