import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const status = new URL(req.url).searchParams.get("status") || "All";
  const payouts = await prisma.sellerPayout.findMany({
    where: status === "All" ? {} : { status },
    orderBy: { requestedAt: "desc" },
    include: { seller: { select: { storeName: true, storeSlug: true, id: true } } },
    take: 300,
  });
  return NextResponse.json({
    payouts: payouts.map((p: any) => ({
      ...p,
      requestedAt: p.requestedAt.toISOString(),
      approvedAt: p.approvedAt?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
  });
}
