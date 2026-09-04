import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

export const CUSTOMER_COOKIE = "customerAuth";
const CUSTOMER_TTL_SECONDS = 60 * 60 * 24 * 30;

function signingSecret(): string {
  const secret = process.env.CUSTOMER_AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Backward-compatible fallback so existing deployments that only configured
  // ADMIN_AUTH_SECRET keep their customer sessions valid until they set
  // CUSTOMER_AUTH_SECRET to a distinct value.
  const legacy = process.env.ADMIN_AUTH_SECRET;
  if (legacy && legacy.length >= 16) return legacy;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CUSTOMER_AUTH_SECRET must be set in production.");
  }
  return "dev-only-insecure-customer-secret-please-override";
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

/**
 * Create a signed customer session token. Carries the user id (subject) plus
 * the normalized email so email-keyed records (orders, addresses,
 * notifications) can be resolved without re-deriving it from untrusted input.
 */
export function createCustomerToken(userId: string, email: string): string {
  const exp = Math.floor(Date.now() / 1000) + CUSTOMER_TTL_SECONDS;
  const payload = `customer:${userId}:${email.toLowerCase()}::${exp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(payload);
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string; email: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  let payload = "";
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return null;
  }
  if (!payload.startsWith("customer:")) return null;
  const seg = payload.split("::"); // [customer:userId:email, exp]
  if (seg.length !== 2) return null;
  const inner = seg[0].split(":"); // [customer, userId, email...]
  if (inner.length < 3) return null;
  const exp = Number(seg[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  const email = inner.slice(2).join(":");
  return { userId: inner[1], email };
}

/** Return the authenticated customer's id + email from the cookie, or null. */
export function getAuthenticatedCustomer(req: NextRequest): { userId: string; email: string } | null {
  const token = req.cookies.get(CUSTOMER_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

/**
 * Authenticates the customer request and loads the user. Returns an
 * unauthorized/forbidden NextResponse on failure, or null when valid with the
 * `user` passed back via out-param.
 */
export async function requireCustomer(
  req: NextRequest
): Promise<{ response: NextResponse } | { response: null; user: any }> {
  const auth = getAuthenticatedCustomer(req);
  if (!auth) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user || user.deletedAt) {
    return {
      response: NextResponse.json({ error: "Account not found" }, { status: 401 }),
    };
  }
  if (user.accountStatus === "BLOCKED") {
    return {
      response: NextResponse.json(
        { error: "Your account has been blocked. Please contact support." },
        { status: 403 }
      ),
    };
  }
  return { response: null, user };
}
