import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

export const SELLER_COOKIE = "sellerAuth";
const SELLER_TTL_SECONDS = 60 * 60 * 24 * 7;

function signingSecret(): string {
  const secret = process.env.SELLER_AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Backward-compatible fallback so existing deployments that only configured
  // ADMIN_AUTH_SECRET keep their seller sessions valid until they set
  // SELLER_AUTH_SECRET to a distinct value.
  const legacy = process.env.ADMIN_AUTH_SECRET;
  if (legacy && legacy.length >= 16) return legacy;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SELLER_AUTH_SECRET must be set in production.");
  }
  return "dev-only-insecure-seller-secret-please-override";
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createSellerToken(sellerId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SELLER_TTL_SECONDS;
  const payload = `seller:${sellerId}:${exp}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = sign(payload);
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): string | null {
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
  if (!payload.startsWith("seller:")) return null;
  const seg = payload.split(":");
  const exp = Number(seg[2]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expectedSig = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? seg[1] : null;
}

export function getAuthenticatedSellerId(req: NextRequest): string | null {
  const token = req.cookies.get(SELLER_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export function sellerStatusToMessage(status: string): string | null {
  switch (status) {
    case "PENDING":
    case "UNDER_REVIEW":
      return "Your seller application is currently under review.";
    case "REJECTED":
      return "Your seller application was not approved. Please contact support.";
    case "SUSPENDED":
      return "Your seller account has been suspended. Please contact support.";
    case "BLOCKED":
      return "Your seller account has been blocked. Please contact support.";
    case "INACTIVE":
      return "Your seller account is inactive. Please contact support.";
    case "APPROVED":
      return null;
    default:
      return null;
  }
}

/**
 * Authenticates the seller request and validates seller eligibility. Returns an
 * unauthorized/forbidden NextResponse on failure, or null when the seller is
 * valid and is passed back via the out-param `seller`.
 */
export async function requireSeller(
  req: NextRequest
): Promise<{ response: NextResponse } | { response: null; seller: any }> {
  const sellerId = getAuthenticatedSellerId(req);
  if (!sellerId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
    },
  });
  if (!seller) {
    return {
      response: NextResponse.json({ error: "Seller not found" }, { status: 404 }),
    };
  }
  const blockError = sellerStatusToMessage(seller.approvalStatus);
  if (blockError) {
    return {
      response: NextResponse.json(
          { error: blockError, status: seller.approvalStatus },
        { status: 403 }
      ),
    };
  }
  return { response: null, seller };
}

// Statuses that may still engage with the platform (e.g. complete identity
// verification) even though they are not yet approved sellers.
export const VERIFICATION_ACCESSIBLE = new Set([
  "PENDING",
  "UNDER_REVIEW",
  "RESUBMISSION_REQUIRED",
  "APPROVED",
]);

/**
 * Authenticates for verification-only access. Unlike `requireSeller`, this
 * ALLOWS PENDING / UNDER_REVIEW / RESUBMISSION_REQUIRED sellers through (they
 * need to manage their identity verification). It still blocks REJECTED,
 * SUSPENDED, BLOCKED and INACTIVE.
 */
export async function requireSellerAny(
  req: NextRequest
): Promise<{ response: NextResponse } | { response: null; seller: any }> {
  const sellerId = getAuthenticatedSellerId(req);
  if (!sellerId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
    },
  });
  if (!seller) {
    return {
      response: NextResponse.json({ error: "Seller not found" }, { status: 404 }),
    };
  }
  if (!VERIFICATION_ACCESSIBLE.has(seller.approvalStatus)) {
    return {
      response: NextResponse.json(
        { error: sellerStatusToMessage(seller.approvalStatus), status: seller.approvalStatus },
        { status: 403 }
      ),
    };
  }
  return { response: null, seller };
}
