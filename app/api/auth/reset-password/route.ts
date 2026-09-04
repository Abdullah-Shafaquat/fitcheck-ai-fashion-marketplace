import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken, consumePasswordResetToken } from "@/lib/customerAccount";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ valid: false, error: "Missing token." }, { status: 400 });
  }

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null },
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "Invalid or expired link." }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, { windowMs: 60_000, max: 6, label: "reset-password" });
    if (limited) return limited;

    const body = await req.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    const result = await consumePasswordResetToken(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
