import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeImages, normalizeColorImages } from "@/lib/productImages";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const category = url.searchParams.get("category") || "";

  const seller = await prisma.sellerProfile.findUnique({
    where: { storeSlug: slug },
  });
  if (!seller || seller.approvalStatus !== "APPROVED") {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: {
      sellerId: seller.id,
      isActive: true,
      approvalStatus: "APPROVED",
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { category: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { storeName: true, storeSlug: true, logo: true } } },
  });

  const categories = await prisma.product.findMany({
    where: { sellerId: seller.id, isActive: true, approvalStatus: "APPROVED" },
    distinct: ["category"],
    select: { category: true },
  });

  return NextResponse.json({
    seller: {
      id: seller.id,
      storeName: seller.storeName,
      storeSlug: seller.storeSlug,
      logo: seller.logo,
      banner: seller.banner,
      description: seller.description,
      ownerName: seller.ownerName,
      businessType: seller.businessType,
      address: seller.address,
      city: seller.city,
      province: seller.province,
      country: seller.country,
      phone: seller.phone,
      email: seller.email,
      supportContact: seller.supportContact,
      socialLinks: seller.socialLinks || {},
      approvedAt: seller.approvedAt?.toISOString() ?? null,
      productCount: products.length,
    },
    products: products.map((p: any) => ({
      ...p,
      images: normalizeImages(p.images),
      colorImages: normalizeColorImages(p.colorImages),
    })),
    categories: categories.map((c) => c.category).filter(Boolean),
  });
}
