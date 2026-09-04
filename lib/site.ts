/**
 * Canonical site origin used for SEO metadata (metadataBase, canonical,
 * sitemap, robots, Open Graph). Reads a production site URL first, then
 * falls back to NEXTAUTH_URL, then localhost.
 *
 * Only read at request/build time on the server — never expose secrets.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (explicit) return stripTrailingSlash(explicit);
  const nextAuth = process.env.NEXTAUTH_URL;
  if (nextAuth) return stripTrailingSlash(nextAuth);
  return "http://localhost:3000";
}

export function siteName(): string {
  return "FitCheck";
}

export function siteTagline(): string {
  return "I'm a modern fashion e-commerce experience for the latest clothing styles — clean, curated and easy to shop.";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
