import { NextRequest, NextResponse } from "next/server";
import { requireSellerAny } from "@/lib/seller-auth";
import { submitVerification, VerificationImageInput } from "@/lib/sellerVerification";

export async function POST(req: NextRequest) {
  const auth = await requireSellerAny(req);
  if (auth.response) return auth.response;
  const seller = auth.seller;
  if (seller.approvalStatus === "APPROVED") {
    return NextResponse.json({ error: "Your seller account is already approved." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const result = await submitVerification({
      sellerId: seller.id,
      cnicNumber: String(body.cnicNumber || ""),
      cnicFrontPath: String(body.cnicFrontPath || ""),
      cnicBackPath: String(body.cnicBackPath || ""),
      images: Array.isArray(body.images)
        ? (body.images as VerificationImageInput[])
        : [],
      liveVideoPath: String(body.liveVideoPath || ""),
      liveVideoDuration: body.liveVideoDuration ? Number(body.liveVideoDuration) : null,
      liveVideoThumbnail: body.liveVideoThumbnail ? String(body.liveVideoThumbnail) : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SELLER_VERIFICATION_SUBMIT]", error);
    return NextResponse.json({ error: "Failed to submit verification." }, { status: 500 });
  }
}
