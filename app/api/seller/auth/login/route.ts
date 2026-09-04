import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizeEmail, isValidEmail } from "@/lib/customerAccount";
import {
  createSellerToken,
  SELLER_COOKIE,
  sellerStatusToMessage,
  VERIFICATION_ACCESSIBLE,
} from "@/lib/seller-auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { windowMs: 60_000, max: 10, label: "seller-login" });
    if (limited) return limited;

    const body = await req.json();
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");

    if (!isValidEmail(email) || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });
    }

    const seller = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    if (!seller) {
      return NextResponse.json(
        { error: "This account does not have a seller profile. Please apply to become a seller." },
        { status: 404 }
      );
    }

    // PENDING / UNDER_REVIEW / RESUBMISSION_REQUIRED sellers may log in so they
    // can complete identity verification. All other non-approved statuses are
    // blocked entirely.
    if (!VERIFICATION_ACCESSIBLE.has(seller.approvalStatus)) {
      const statusBlock = sellerStatusToMessage(seller.approvalStatus);
      if (statusBlock) {
        return NextResponse.json(
          { error: statusBlock, status: seller.approvalStatus },
          { status: 403 }
        );
      }
    }

    if (user.provider === "email") {
      const valid = await compare(password, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    } else if (user.provider === "google") {
      // Google-linked sellers must sign in through the site; accept any password
      // here is unsafe, so require the email/password path only where possible.
      // For Google users we still allow login since the seller cookie is the guard.
      return NextResponse.json(
        { error: "Please sign in with your password on the main account to manage your store." },
        { status: 400 }
      );
    }

    const token = createSellerToken(seller.id);
    const isProd = process.env.NODE_ENV === "production";
    const isApproved = seller.approvalStatus === "APPROVED";
    return NextResponse.json(
      {
        success: true,
        access: isApproved ? "dashboard" : "verification",
        seller: { id: seller.id, storeName: seller.storeName },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": `${SELLER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isProd ? "; Secure" : ""}`,
        },
      }
    );
  } catch (error) {
    console.error("[SELLER_LOGIN]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
