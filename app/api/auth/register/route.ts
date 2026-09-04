import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { assertCanRegister, normalizeEmail, isValidEmail, publicUserFields } from "@/lib/customerAccount";
import { createCustomerToken, CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, { windowMs: 60_000, max: 8, label: "register" });
    if (limited) return limited;

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const normalized = normalizeEmail(email);
    const registerError = await assertCanRegister(normalized);
    if (registerError) {
      const status = registerError.includes("already exists") ? 409 : 403;
      return NextResponse.json({ error: registerError }, { status });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalized,
        passwordHash,
        provider: "email",
        accountStatus: "ACTIVE",
      },
    });

    const token = createCustomerToken(user.id, user.email);
    const res = NextResponse.json({ user: publicUserFields(user) }, { status: 201 });
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
