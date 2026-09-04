import { NextResponse } from "next/server";
import { SELLER_COOKIE } from "@/lib/seller-auth";

export async function POST() {
  const isProd = process.env.NODE_ENV === "production";
  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `${SELLER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`,
      },
    }
  );
}
