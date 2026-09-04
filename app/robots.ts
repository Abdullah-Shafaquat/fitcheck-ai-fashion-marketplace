import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * robots.txt — blocks crawlers from private/fungible areas. Robots rules are a
 * crawl hint only, never a security boundary; all sensitive routes are
 * auth-guarded server-side regardless of this file.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/seller",
          "/account",
          "/checkout",
          "/cart",
          "/wishlist",
          "/track-order",
          "/orders/",
          "/reset-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
