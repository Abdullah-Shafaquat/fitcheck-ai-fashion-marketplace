import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const notifications = await prisma.sellerNotification.findMany({
    where: { sellerId: auth.seller.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    notifications: notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const id = String(body.id || "");
  if (id) {
    await prisma.sellerNotification.updateMany({
      where: { id, sellerId: auth.seller.id },
      data: { read: true },
    });
  } else {
    await prisma.sellerNotification.updateMany({ where: { sellerId: auth.seller.id }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
