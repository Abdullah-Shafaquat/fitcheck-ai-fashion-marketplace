import prisma from "@/lib/prisma";
import { normalizeImages } from "@/lib/productImages";

// ---------------------------------------------------------------------------
// Server-side, safe tool layer used by the FitCheck Gemini shopping agent.
//
// All DB access happens here (the server controls credentials). Only minimal,
// public-safe product data is returned to the model — never inventory keys,
// seller PII, or anything sensitive. Account/order tools are only invoked with
// an authenticated customer identity resolved server-side.
// ---------------------------------------------------------------------------

export interface AiProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  category: string;
  subCategory: string | null;
  gender: string;
  image: string;
  sizes: string[];
  colors: string[];
  stock: number;
  rating: number;
  reviews: number;
  badge: string | null;
  isActive: boolean;
  approvalStatus?: string | null;
  productOwnerType?: string | null;
  url: string;
}

export interface AiOrderSummary {
  orderNo: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  createdAt: string;
  url: string;
}

// Building block: always restrict to publicly sellable products.
function publicWhere() {
  return {
    isActive: true,
    OR: [{ productOwnerType: "PLATFORM" }, { approvalStatus: "APPROVED" }],
  };
}

function toAiProduct(p: any): AiProduct {
  const images = Array.isArray(p.images) && p.images.length ? normalizeImages(p.images) : [];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    oldPrice: p.oldPrice ?? null,
    category: p.category || "",
    subCategory: p.subCategory ?? null,
    gender: p.gender || "",
    image: images[0] || "/images/placeholder.jpg",
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    stock: p.stock ?? 0,
    rating: p.rating ?? 0,
    reviews: p.reviews ?? 0,
    badge: p.badge ?? null,
    isActive: p.isActive ?? true,
    approvalStatus: p.approvalStatus ?? null,
    productOwnerType: p.productOwnerType ?? null,
    url: `/products/${p.slug}`,
  };
}

export async function searchProducts(args: any = {}): Promise<AiProduct[]> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const category = typeof args.category === "string" ? args.category.trim() : "";
  const gender = typeof args.gender === "string" ? args.gender.trim() : "";
  const color = typeof args.color === "string" ? args.color.trim() : "";
  const size = typeof args.size === "string" ? args.size.trim() : "";
  const minPrice = Number(args.minPrice);
  const maxPrice = Number(args.maxPrice);
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);

  const and: any[] = [publicWhere()];

  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { subCategory: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (category) and.push({ category: { equals: category, mode: "insensitive" } });
  if (gender) and.push({ gender: { equals: gender, mode: "insensitive" } });
  if (color) and.push({ colors: { has: color } });
  if (size) and.push({ sizes: { has: size } });

  const priceFilter: any = {};
  if (!Number.isNaN(minPrice)) priceFilter.gte = minPrice;
  if (!Number.isNaN(maxPrice)) priceFilter.lte = maxPrice;
  if (Object.keys(priceFilter).length) and.push({ price: priceFilter });

  const products = await prisma.product.findMany({
    where: { AND: and.length === 1 ? and[0] : { AND: and } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return products.map(toAiProduct);
}

export async function getFeaturedProducts(args: any = {}): Promise<AiProduct[]> {
  const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 20);
  const products = await prisma.product.findMany({
    where: { AND: [publicWhere(), { featured: true }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toAiProduct);
}

export async function getSaleProducts(args: any = {}): Promise<AiProduct[]> {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
  const products = await prisma.product.findMany({
    where: { AND: [publicWhere(), { oldPrice: { not: null } }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return products.map(toAiProduct);
}

export async function getProductsByPriceRange(args: any = {}): Promise<AiProduct[]> {
  return searchProducts({
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
    limit: args.limit,
  });
}

export async function getProductBySlug(slug: string): Promise<AiProduct | null> {
  if (!slug) return null;
  const p = await prisma.product.findFirst({
    where: { AND: [{ slug }, publicWhere()] },
  });
  return p ? toAiProduct(p) : null;
}

// Account-scoped tools — callers MUST pass an authenticated customer email
// resolved server-side. The email is the ownership key for orders, and we only
// ever return that customer's own orders.
export async function getCustomerOrders(email: string, args: any = {}): Promise<AiOrderSummary[]> {
  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
  const orders = await prisma.order.findMany({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      orderNo: true,
      status: true,
      paymentStatus: true,
      total: true,
      items: true,
      createdAt: true,
    },
  });
  return orders.map((o) => ({
    orderNo: o.orderNo,
    status: o.status,
    paymentStatus: o.paymentStatus || "N/A",
    total: o.total,
    itemCount: Array.isArray(o.items) ? o.items.length : 0,
    createdAt: o.createdAt.toISOString(),
    url: `/orders/${o.orderNo}`,
  }));
}

// Returns a compact product list for outfit building / comparison. Empties are
// fine — the agent reports "no matches" instead of inventing stock.
export async function getProductsByGender(args: any = {}): Promise<AiProduct[]> {
  return searchProducts({ gender: args.gender, limit: args.limit });
}

export async function getProductsByCategory(args: any = {}): Promise<AiProduct[]> {
  return searchProducts({ category: args.category, limit: args.limit });
}
