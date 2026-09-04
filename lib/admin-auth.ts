import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "adminAuth";
const ADMIN_TTL_SECONDS = 60 * 60 * 24 * 7;

// Server-only signing secret. Never expose via NEXT_PUBLIC_*.
function signingSecret(): string {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Development fallback — production must set ADMIN_AUTH_SECRET.
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_AUTH_SECRET must be set in production.");
  }
  return "dev-only-insecure-admin-secret-please-override";
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createAdminToken(): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS;
  const payload = `admin:${exp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(payload);
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;

  let payload = "";
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return false;
  }

  if (!payload.startsWith("admin:")) return false;
  const exp = Number(payload.split(":")[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return verifyToken(token || "");
}

export function requireAdmin(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}
