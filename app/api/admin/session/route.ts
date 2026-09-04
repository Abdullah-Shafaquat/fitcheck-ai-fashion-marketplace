import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/** Server-derived admin auth check. The client uses this instead of trusting a
 *  forgeable localStorage flag; the actual authorization boundary for every
 *  admin API remains the signed adminAuth cookie validated by requireAdmin. */
export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(req) });
}
