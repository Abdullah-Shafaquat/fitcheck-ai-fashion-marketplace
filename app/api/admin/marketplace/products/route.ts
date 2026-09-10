import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { normalizeImages, normalizeColorImages } from "@/lib/productImages";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin) return admin;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "PENDING_REVIEW";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize")) || 20));

  const where = { productOwnerType: "SELLER" as const, approvalStatus: status };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { seller: { select: { storeName: true, storeSlug: true, id: true } } },
    }),
  ]);

  // Rejection review info is only needed for REJECTED products on the current
  // page. Look it up with a bounded JSONB filter over the current page's ids
  // instead of loading the entire PRODUCT_REJECTED audit trail.
  const rejectedReviewById: Record<string, { reviewer: string; reviewedAt: string; reason: string }> = {};
  if (status === "REJECTED" && products.length > 0) {
    const productIds = products.map((p) => p.id);
    const reviewLogs = await prisma.$queryRaw<
      Array<{ performedBy: string | null; createdAt: Date; details: string | null }>
    >`
      SELECT "performedBy", "createdAt", "details"
      FROM "SellerAuditLog"
      WHERE "action" = 'PRODUCT_REJECTED'
        AND "details"::jsonb->>'productId' = ANY(${productIds})
      ORDER BY "createdAt" DESC
    `;
    for (const log of reviewLogs) {
      let productId: string | null = null;
      try {
        const d = log.details ? JSON.parse(log.details) : null;
        if (d && typeof d.productId === "string") productId = d.productId;
      } catch {
        productId = null;
      }
      if (!productId) continue;
      if (rejectedReviewById[productId]) continue;
      rejectedReviewById[productId] = {
        reviewer: log.performedBy || "admin",
        reviewedAt: log.createdAt.toISOString(),
        reason: String(detailsJsonReason(log.details) ?? ""),
      };
    }
  }

  return NextResponse.json({
    products: products.map((p: any) => ({
      ...p,
      images: normalizeImages(p.images),
      colorImages: normalizeColorImages(p.colorImages),
      createdAt: p.createdAt.toISOString(),
      rejectionReview: p.approvalStatus === "REJECTED" ? rejectedReviewById[p.id] ?? null : null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

function detailsJsonReason(details: string | null): string | null {
  if (!details) return null;
  try {
    const d = JSON.parse(details);
    if (d && typeof d.reason === "string") return d.reason;
  } catch {
    return null;
  }
  return null;
}
