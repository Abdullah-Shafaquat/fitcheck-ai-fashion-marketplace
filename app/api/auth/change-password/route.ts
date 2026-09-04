import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;

    const limited = rateLimit(req, { windowMs: 60_000, max: 6, label: "change-password" });
    if (limited) return limited;

    const body = await req.json();
    const user = auth.user;
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, forcePasswordReset: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHANGE_PASSWORD]", error);
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }
}
