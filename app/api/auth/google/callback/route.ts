import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import {
  assertCanLogin,
  assertCanRegister,
  normalizeEmail,
  publicUserFields,
} from "@/lib/customerAccount";
import { createCustomerToken, CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { safeReturnUrl } from "@/lib/redirect";

// Decode the state we originally set (fc:<dest>) and validate it as a safe
// internal path. Never trust arbitrary query params on the callback.
function resolveState(state: string | null): string {
  if (!state) return "/";
  try {
    const dec = Buffer.from(state, "base64url").toString();
    if (dec.startsWith("fc:")) return safeReturnUrl(dec.slice(3), "/");
  } catch {
    /* ignore */
  }
  return "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = url.origin.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/login?google=error`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[GOOGLE_CALLBACK] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return NextResponse.redirect(`${baseUrl}/login?google=error`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[GOOGLE_CALLBACK] Token exchange failed", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/login?google=error`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // Fetch user profile info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.error("[GOOGLE_CALLBACK] Userinfo failed", await userInfoRes.text());
      return NextResponse.redirect(`${baseUrl}/login?google=error`);
    }

    const profile = await userInfoRes.json();
    const email = normalizeEmail(profile.email || "");
    const name = profile.name || email.split("@")[0];

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/login?google=error`);
    }

    const registerBlock = await assertCanRegister(email);
    const existingBefore = await prisma.user.findUnique({ where: { email } });

    if (!existingBefore && registerBlock) {
      return NextResponse.redirect(`${baseUrl}/login?google=blocked`);
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    const avatar = profile.picture || null;

    if (user) {
      const loginError = await assertCanLogin(user);
      if (loginError) {
        return NextResponse.redirect(`${baseUrl}/login?google=blocked`);
      }

      const patch: { provider?: string; image?: string | null; lastLoginAt?: Date } = {
        lastLoginAt: new Date(),
      };
      if (user.provider !== "google") patch.provider = "google";
      if (user.image !== avatar) patch.image = avatar;

      user = await prisma.user.update({
        where: { email },
        data: patch,
      });
    } else {
      const randomPassword = randomBytes(32).toString("hex");
      const { hash } = await import("bcryptjs");
      const passwordHash = await hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          provider: "google",
          image: avatar,
          accountStatus: "ACTIVE",
          lastLoginAt: new Date(),
        },
      });
    }

    const payload = Buffer.from(JSON.stringify(publicUserFields(user!))).toString("base64url");
    const dest = resolveState(url.searchParams.get("state"));
    const callbackUrl = new URL(`${baseUrl}/auth/callback`);
    callbackUrl.searchParams.set("u", payload);
    if (dest !== "/") callbackUrl.searchParams.set("redirect", dest);
    const redirect = NextResponse.redirect(callbackUrl.toString());
    const token = createCustomerToken(user!.id, user!.email);
    redirect.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return redirect;
  } catch (err) {
    console.error("[GOOGLE_CALLBACK_ERROR]", err);
    return NextResponse.redirect(`${baseUrl}/login?google=error`);
  }
}