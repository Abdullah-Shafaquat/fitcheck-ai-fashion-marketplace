import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeImages } from "@/lib/productImages";

const MAX_ITEMS = 200;

/**
 * Live re-validation of cart/wishlist items against the real database.
 *
 * Read-only and safe to call for guests and signed-in customers. Returns the
 * authoritative, current price/stock/availability and variant availability for
 * each requested product line so client UIs can reconcile stale local cart or
 * wishlist data (price changes, sold-out items, unapproved/inactive products,
 * removed sizes/colors) instead of trusting what was stored locally earlier.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rawItems = (body as { items?: unknown })?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  const items = rawItems
    .slice(0, MAX_ITEMS)
    .map((raw) => {
      const it = (raw || {}) as Record<string, unknown>;
      return {
        productId: String(it.productId || "").trim(),
        size: String(it.size || "").trim(),
        color: String(it.color || "").trim(),
      };
    })
    .filter((i) => i.productId);

  if (items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const results = items.map((item) => {
    const p = productMap.get(item.productId);
    if (!p) {
      return {
        productId: item.productId,
        found: false,
        size: item.size,
        color: item.color,
        publiclyAvailable: false,
        sizeAvailable: false,
        colorAvailable: false,
        canOrder: false,
        reason: "not_found",
      };
    }

    const publiclyAvailable =
      p.isActive && (p.productOwnerType === "PLATFORM" || p.approvalStatus === "APPROVED");
    const sizeAvailable = p.sizes.length === 0 || !item.size || p.sizes.includes(item.size);
    const colorAvailable =
      p.colors.length === 0 ||
      !item.color ||
      p.colors.some((c) => c.toLowerCase() === item.color.toLowerCase());

    let reason: string | null = null;
    if (!publiclyAvailable) reason = "unavailable";
    else if (!sizeAvailable) reason = "size_unavailable";
    else if (!colorAvailable) reason = "color_unavailable";
    else if (p.stock <= 0) reason = "out_of_stock";

    return {
      productId: p.id,
      found: true,
      size: item.size,
      color: item.color,
      name: p.name,
      slug: p.slug,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      stock: p.stock,
      image: normalizeImages(p.images)[0] || null,
      category: p.category,
      subCategory: p.subCategory,
      gender: p.gender,
      badge: p.badge ?? null,
      publiclyAvailable,
      sizeAvailable,
      colorAvailable,
      canOrder: publiclyAvailable && sizeAvailable && colorAvailable && p.stock > 0,
      reason,
    };
  });

  return NextResponse.json({ results });
}