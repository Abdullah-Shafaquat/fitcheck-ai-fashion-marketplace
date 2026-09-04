import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getMarketplaceAnalytics } from "@/lib/sellerAdmin";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const analytics = await getMarketplaceAnalytics();
  return NextResponse.json({ analytics });
}
