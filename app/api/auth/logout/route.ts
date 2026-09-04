import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { SELLER_COOKIE } from "@/lib/seller-auth";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";
  for (const name of [CUSTOMER_COOKIE, SELLER_COOKIE, ADMIN_COOKIE]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}
