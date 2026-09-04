import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { sellerSummary, serializeSellerProfile } from "@/lib/sellerAccount";
import { reconcilePendingToAvailable } from "@/lib/sellerEarnings";

export async function GET(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;
  const seller = auth.seller;

  await reconcilePendingToAvailable(seller.id);
  const summary = await sellerSummary(seller.id);
  return NextResponse.json({
    seller: serializeSellerProfile(seller),
    summary,
  });
}
