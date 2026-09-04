import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import {
  assertCanLogin,
  normalizeEmail,
  isValidEmail,
  publicUserFields,
} from "@/lib/customerAccount";
import { createCustomerToken, CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, max: 12, label: "login" });
    if (limited) return limited;

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const normalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 401 }
      );
    }

    if (user.provider === "google") {
      return NextResponse.json(
        { error: "This email is linked to a Google account. Please use Continue with Google." },
        { status: 401 }
      );
    }

    const loginError = await assertCanLogin(user);
    if (loginError) {
      return NextResponse.json({ error: loginError }, { status: 403 });
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = createCustomerToken(user.id, user.email);
    const res = NextResponse.json({
      user: publicUserFields(user),
      requiresPasswordReset: user.forcePasswordReset,
    });
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
