import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";
import {
  getSellerEarningsStatements,
  reconcilePendingToAvailable,
} from "@/lib/sellerEarnings";
import { getSellerDashboardStats } from "@/lib/sellerOrders";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  await reconcilePendingToAvailable(auth.seller.id);
  const seller = await prisma.sellerProfile.findUnique({ where: { id: auth.seller.id } });
  const statements = await getSellerEarningsStatements(auth.seller.id);
  const stats = await getSellerDashboardStats(auth.seller.id);
  return NextResponse.json({
    balances: {
      availableBalance: seller?.availableBalance ?? 0,
      pendingBalance: seller?.pendingBalance ?? 0,
      totalEarnings: seller?.totalEarnings ?? 0,
      totalPaidOut: seller?.totalPaidOut ?? 0,
    },
    statements,
    stats,
  });
}
