import { NextRequest, NextResponse } from "next/server";
import { safeReturnUrl } from "@/lib/redirect";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured in .env" },
      { status: 500 }
    );
  }

  const baseUrl = req.nextUrl.origin.replace(/\/$/, "");

  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Preserve the caller's intended destination (validated as a safe internal
  // path) through the OAuth round-trip via the `state` parameter.
  const rawState = new URL(req.url).searchParams.get("redirect");
  const dest = safeReturnUrl(rawState, "/");
  const state = Buffer.from(`fc:${dest}`).toString("base64url");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
