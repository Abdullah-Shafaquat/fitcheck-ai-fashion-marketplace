import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

/**
 * Dynamic sitemap.xml built from real database data. Only public routes are
 * included:
 *   - public category / subcategory landings
 *   - static policy/company pages
 *   - active, public (platform or approved seller) products
 * Private areas (admin / seller / account / checkout / cart / wishlist /
 * tracking / orders) are intentionally excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [];

  // 1. Homepage
  entries.push({ url: `${base}/`, changeFrequency: "daily", priority: 1 });

  // 2. Public category / subcategory landings
  const categories = [
    "men", "women", "kids", "clothing", "shoes", "accessories",
    "new-arrivals", "sale", "featured",
    "t-shirts", "shirts", "jeans", "hoodies-sweatshirts", "jackets", "coats",
    "trousers", "cargo-pants", "shorts", "sweaters", "tracksuits", "dresses",
    "tops", "blouses", "leggings", "skirts", "cardigans", "activewear",
    "sneakers", "running-shoes", "casual-shoes", "boots", "loafers", "sandals",
    "heels", "flats", "kids-shoes", "bags", "backpacks", "belts", "hats",
    "caps", "sunglasses", "wallets", "watches", "jackets-coats",
  ];
  for (const category of categories) {
    entries.push({ url: `${base}/${category}`, changeFrequency: "daily", priority: 0.8 });
  }

  // 3. Static / policy pages
  const staticPages = [
    "about", "our-story", "contact", "faq", "shipping", "returns",
    "privacy", "terms", "size-guide", "careers", "sitemap",
  ];
  for (const page of staticPages) {
    entries.push({ url: `${base}/${page}`, changeFrequency: "monthly", priority: 0.5 });
  }

  // 4. Public products (active + platform or approved seller).
  // Bounded to the most recent public products so the sitemap stays reasonable.
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ productOwnerType: "PLATFORM" }, { approvalStatus: "APPROVED" }],
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    for (const p of products) {
      entries.push({
        url: `${base}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // If DB is unavailable, still emit the static portion of the sitemap.
  }

  return entries;
}
