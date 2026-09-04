import { NextRequest, NextResponse } from "next/server";
import { requireSellerAny } from "@/lib/seller-auth";
import { getVerificationForSeller, serializeVerification } from "@/lib/sellerVerification";

export async function GET(req: NextRequest) {
  const auth = await requireSellerAny(req);
  if (auth.response) return auth.response;
  const seller = auth.seller;
  const verification = await getVerificationForSeller(seller.id);
  return NextResponse.json({
    seller: {
      id: seller.id,
      storeName: seller.storeName,
      approvalStatus: seller.approvalStatus,
      verificationStatus: seller.verificationStatus,
      rejectionReason: seller.rejectionReason,
    },
    verification: verification ? serializeVerification(verification, { forOwner: true }) : null,
  });
}
