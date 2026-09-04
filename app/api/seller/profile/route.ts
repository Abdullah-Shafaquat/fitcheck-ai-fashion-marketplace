import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";
import { serializeSellerProfile } from "@/lib/sellerAccount";
import { logSellerAudit } from "@/lib/sellerAudit";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  return NextResponse.json({ seller: serializeSellerProfile(auth.seller) });
}

export async function PUT(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const seller = auth.seller;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const data: any = { updatedAt: new Date() };
  const allowed = ["storeName", "ownerName", "phone", "businessType", "description", "address", "city", "province", "country", "supportContact", "logo", "banner", "socialLinks"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "socialLinks") data.socialLinks = body[key] || {};
      else data[key] = String(body[key] ?? "").trim();
    }
  }

  if (body.storeName) {
    const name = String(body.storeName).trim();
    if (name.length < 2) return NextResponse.json({ error: "Store name must be at least 2 characters." }, { status: 400 });
    data.storeName = name;
  }

  await prisma.sellerProfile.update({ where: { id: seller.id }, data });
  await logSellerAudit({ sellerId: seller.id, action: "SELLER_PRODUCT_UPDATED", performedBy: seller.id, details: { kind: "store_settings" } });

  const updated = await prisma.sellerProfile.findUnique({ where: { id: seller.id }, include: { user: { select: { id: true, name: true, email: true, image: true } } } });
  return NextResponse.json({ seller: serializeSellerProfile(updated as any) });
}
