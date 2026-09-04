import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { normalizeEmail, isValidEmail } from "@/lib/customerAccount";
import { applySeller, serializeSellerProfile } from "@/lib/sellerAccount";
import { getAutoApproveSellers } from "@/lib/sellerSettings";
import { sellerStatusToMessage, createSellerToken, SELLER_COOKIE } from "@/lib/seller-auth";
import { notifyAdmin } from "@/lib/notify";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { windowMs: 60_000, max: 6, label: "seller-apply" });
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
    if (user.provider === "google") {
      return NextResponse.json(
        { error: "Google accounts cannot apply for a seller account with a password. Please use your linked email/account settings." },
        { status: 400 }
      );
    }
    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    if (user.accountStatus === "BLOCKED" || user.accountStatus === "DELETED" || user.accountStatus === "SUSPENDED") {
      return NextResponse.json({ error: "This account is not eligible to become a seller." }, { status: 403 });
    }

    const existing = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    if (existing) {
      const msg = sellerStatusToMessage(existing.approvalStatus);
      if (msg) return NextResponse.json({ error: msg, status: existing.approvalStatus }, { status: 409 });
      return NextResponse.json({ error: "You already have an active seller account." }, { status: 409 });
    }

    const autoApprove = await getAutoApproveSellers();
    const result = await applySeller({
      userId: user.id,
      storeName: String(body.storeName || ""),
      ownerName: String(body.ownerName || user.name || ""),
      email,
      phone: String(body.phone || ""),
      businessType: String(body.businessType || ""),
      description: String(body.description || ""),
      address: String(body.address || ""),
      city: String(body.city || ""),
      province: String(body.province || ""),
      country: String(body.country || "Pakistan"),
      verificationDoc: String(body.verificationDoc || ""),
      socialLinks: body.socialLinks || {},
      supportContact: String(body.supportContact || ""),
      autoApprove,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    await notifyAdmin({
      type: "seller_application",
      title: "New Seller Application",
      message: `${result.seller.ownerName || user.name} applied for a seller account (${result.seller.storeName || "Store"}). Awaiting identity verification and review.`,
      link: `/admin/marketplace/sellers/${result.seller.id}`,
    });

    // Set the seller cookie so the application wizard can continue directly
    // into identity verification steps as the newly created seller.
    const token = createSellerToken(result.seller.id);
    const isProd = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        seller: serializeSellerProfile(result.seller as any),
        sellerId: result.seller.id,
        // A seller is always PENDING at submission; approval happens only after
        // identity verification is complete (auto-approve, when enabled, applies then).
        autoApproved: false,
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": `${SELLER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isProd ? "; Secure" : ""}`,
        },
      }
    );
  } catch (error) {
    console.error("[SELLER_APPLY]", error);
    return NextResponse.json({ error: "Failed to submit seller application." }, { status: 500 });
  }
}
