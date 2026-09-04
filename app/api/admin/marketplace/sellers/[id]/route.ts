import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSellerAdminDetail, updateSellerAdmin } from "@/lib/sellerAdmin";
import { normalizeImages, normalizeColorImages } from "@/lib/productImages";
import { serializeVerification } from "@/lib/sellerVerification";

function serializeDetail(seller: any) {
  const verification = seller.verification
    ? serializeVerification(
        {
          ...seller.verification,
          submittedAt: seller.verification.submittedAt,
          resubmissionRequiredAt: seller.verification.resubmissionRequiredAt,
          updatedAt: seller.verification.updatedAt,
          createdAt: seller.verification.createdAt,
          cnicReviewedAt: seller.verification.cnicReviewedAt,
          imagesReviewedAt: seller.verification.imagesReviewedAt,
          videoReviewedAt: seller.verification.videoReviewedAt,
        },
        { forOwner: false }
      )
    : null;
  return {
    ...seller,
    verification,
    createdAt: seller.createdAt?.toISOString() ?? null,
    updatedAt: seller.updatedAt?.toISOString() ?? null,
    approvedAt: seller.approvedAt?.toISOString() ?? null,
    blockedAt: seller.blockedAt?.toISOString() ?? null,
    verificationStatus: seller.verificationStatus,
    socialLinks: seller.socialLinks || {},
    products: seller.products?.map((sp: any) => ({
      ...sp,
      product: sp.product
        ? {
            ...sp.product,
            images: normalizeImages(sp.product.images),
            colorImages: normalizeColorImages(sp.product.colorImages),
          }
        : null,
    })),
    payouts: seller.payouts?.map((p: any) => ({
      ...p,
      requestedAt: p.requestedAt?.toISOString() ?? null,
      approvedAt: p.approvedAt?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    auditLogs: seller.auditLogs?.map((l: any) => ({ ...l, createdAt: l.createdAt?.toISOString() ?? null })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const { id } = await params;
  const seller = await getSellerAdminDetail(id);
  if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
  return NextResponse.json({ seller: serializeDetail(seller) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const data: any = {};
  for (const k of ["storeName", "ownerName", "phone", "businessType", "description", "adminNotes"]) {
    if (body[k] !== undefined) data[k] = String(body[k] ?? "").trim();
  }
  if (body.commissionRate !== undefined) {
    const r = Number(body.commissionRate);
    data.commissionRate = Number.isFinite(r) && r >= 0 && r <= 100 ? r : null;
  }
  await updateSellerAdmin(id, data);
  return NextResponse.json({ ok: true });
}
