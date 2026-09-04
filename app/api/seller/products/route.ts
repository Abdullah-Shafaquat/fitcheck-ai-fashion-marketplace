import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { listSellerProducts, createSellerProduct } from "@/lib/sellerProducts";
import { normalizeImages, normalizeColorImages } from "@/lib/productImages";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const filter = new URL(req.url).searchParams.get("filter") || "All";
  const products = await listSellerProducts(auth.seller.id, filter);
  const normalized = products.map((p: any) => ({
    ...p,
    images: normalizeImages(p.images),
    colorImages: normalizeColorImages(p.colorImages),
  }));
  return NextResponse.json({ products: normalized });
}

export async function POST(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const result = await createSellerProduct(auth.seller.id, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.product, { status: 201 });
  } catch (error) {
    console.error("[SELLER_PRODUCT_CREATE]", error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
