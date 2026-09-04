/**
 * Minimal in-memory rate limiter for sensitive endpoints.
 *
 * DESIGN / DEPLOYMENT MODEL
 * -------------------------
 * This is a single-instance, in-memory limiter — correct for a single Node
 * process, NOT for a horizontally-scaled fleet (see EXTERNAL dependency note).
 *
 * IP handling is proxy-safe:
 *  - Forwarded headers (x-forwarded-for / x-real-ip) are ONLY trusted when the
 *    deployment is behind a trusted reverse proxy that overwrites them
 *    (TRUST_PROXY=true), or when running on Vercel (which overwrites
 *    x-forwarded-for). Otherwise an attacker could spoof these headers to bypass
 *    the limiter, so we deliberately do NOT trust them.
 *  - IP values are sanitized (charset + length whitelist) so arbitrary/malformed
 *    values cannot be used as a key to evade limiting.
 *  - Without a trusted proxy there is no reliable per-request client IP, so the
 *    limiter degrades to a global ceiling (single bucket) — safe against spoof
 *    bypass, but requiring TRUST_PROXY=true for meaningful per-client limiting.
 *
 * FAILURE / AVAILABILITY
 * ----------------------
 *  - rateLimit() is fail-closed by design: it never throws, and it never lets a
 *    request through silently on a broken path. The (in-memory) store cannot be
 *    "unavailable"; if it were, memory consumption is bounded by gc().
 *  - rateLimitSafe() is provided for payment webhooks: it is intentionally
 *    fail-open (a mishap never blocks a legitimate provider retry) because the
 *    authoritative protection for webhooks is signature verification + idempotent
 *    payment processing, not an IP limiter.
 */
import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 200_000;

function isTrustingProxy(): boolean {
  // Vercel overwrites x-forwarded-for; other platforms must set TRUST_PROXY=true
  // only when a trusted reverse proxy rewrites these headers.
  if (process.env.TRUST_PROXY === "true") return true;
  if (process.env.VERCEL === "1") return true;
  return false;
}

function sanitizeIp(value: string): string | null {
  const s = String(value || "").trim();
  if (!s || s.length > 64) return null;
  // Reject anything that isn't a plausible IP/host token (blocks header
  // injection and absurd spoof values).
  if (!/^[A-Za-z0-9:.\[\]%_-]+$/.test(s)) return null;
  return s;
}

export function getClientIp(req: Request): string {
  if (isTrustingProxy()) {
    const forwarded = sanitizeIp(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "");
    if (forwarded) return forwarded;
    const real = sanitizeIp(req.headers.get("x-real-ip") ?? "");
    if (real) return real;
  }
  // No trusted proxy: don't trust any forwarded header.
  return "local";
}

function gc(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  const floor = now - 60_000;
  for (const [key, b] of buckets) {
    if (b.resetAt <= floor) buckets.delete(key);
  }
}

function respondTooMany(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

function makeKey(label: string, key: string): string {
  return `${label}:${key}`;
}

/**
 * The primary limiter. Returns a 429 NextResponse when the request is over the
 * limit, else null (call and return early).
 *
 *   req        - the incoming request (plus NextRequest)
 *   opts.key   - optional explicit limiter key (e.g. `userId|ip`). Defaults to
 *                the safe proxy-aware client IP.
 *   opts.max   - max requests per window (clamped 1..100000)
 *   opts.windowMs - window (clamped 1000..3600000)
 */
export function rateLimit(
  req: Request,
  opts: { windowMs?: number; max?: number; label?: string; key?: string } = {}
): NextResponse | null {
  const windowMs = Math.min(Math.max(opts.windowMs || 60_000, 1000), 3_600_000);
  const max = Math.min(Math.max(opts.max || 60, 1), 100_000);
  const now = Date.now();
  gc(now);

  const ip = typeof opts.key === "string" && opts.key ? opts.key : getClientIp(req);
  const bucketKey = makeKey(opts.label || "rl", ip);
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return respondTooMany(retryAfterSeconds);
  }
  return null;
}

/**
 * Fail-open limiter for server-to-server webhooks. Never blocks on limiter
 * state; intended as a very high runaway-abuse ceiling only. Provider retries
 * are the correctness-critical path and must never be dropped by this optional
 * guard — signature verification remains the authoritative check.
 */
export function rateLimitSafe(
  req: Request,
  opts: { windowMs?: number; max?: number; label?: string; key?: string } = {}
): NextResponse | null {
  try {
    return rateLimit(req, { ...opts, max: Math.max(opts.max || 600, 50) });
  } catch {
    return null;
  }
}
