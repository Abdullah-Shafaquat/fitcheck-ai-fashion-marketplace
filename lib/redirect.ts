const SAFE_DESTINATIONS: string[] = [
  "/account",
  "/account/addresses",
  "/account/notifications",
  "/account/settings",
  "/cart",
  "/checkout",
  "/orders",
  "/wishlist",
  "/track-order",
];

// Validate and return a safe internal return URL from a caller-supplied value.
// Prevents open-redirect vulnerabilities: only same-origin paths are allowed.
export function safeReturnUrl(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  let dest = raw;
  try {
    // Ensure it parses as a same-origin/internal path only.
    const parsed = new URL(dest, "http://fitcheck.local");
    // Reject absolute external URLs, protocol-relative (//host), and anything
    // that isn't a path within this origin.
    if (dest.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(dest)) return fallback;
    if (parsed.origin !== "http://fitcheck.local") return fallback;
    dest = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }

  if (!dest.startsWith("/") || dest.startsWith("//")) return fallback;

  // Default rule: allow any internal path, but for safety-sensitive account
  // flows restrict to the known safe set unless it's a protected customer area.
  // We allow any internal path that is NOT an admin/seller login bypass, and
  // always refuse redirecting into admin/seller chrome.
  if (dest.startsWith("/admin") || dest.startsWith("/seller")) return fallback;

  return dest;
}

// When returning a logged-in customer to where they were, only allow the safe
// customer destinations (or a plain internal path). Exposed for the login UI.
export function readIntendedDestination(): string {
  if (typeof window === "undefined") return "/";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("returnUrl") || params.get("next") || params.get("redirect");
    return safeReturnUrl(raw, "/");
  } catch {
    return "/";
  }
}

// The safe default landing for a just-signed-in customer when no intended
// destination was supplied.
export const LOGIN_FALLBACK = "/";
