import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import prisma from "@/lib/prisma";
import {
  updateSellerProduct,
  deleteSellerProduct,
  submitSellerProductForReview,
} from "@/lib/sellerProducts";
import { normalizeImages, normalizeColorImages } from "@/lib/productImages";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: { select: { storeName: true } } },
  });
  if (!product || product.sellerId !== auth.seller.id) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({
    product: {
      ...product,
      images: normalizeImages(product.images),
      colorImages: normalizeColorImages(product.colorImages),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const body = await req.json();
    const result = await updateSellerProduct(auth.seller.id, id, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.product);
  } catch (error) {
    console.error("[SELLER_PRODUCT_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const result = await deleteSellerProduct(auth.seller.id, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// POST for one-off actions: submit-for-review, or create-with-draft
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.action === "submit") {
    const result = await submitSellerProductForReview(auth.seller.id, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
