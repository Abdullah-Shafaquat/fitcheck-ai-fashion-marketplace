import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/customerAccount";
import { round2, getDefaultCommissionRate } from "@/lib/sellerSettings";
import { logSellerAudit } from "@/lib/sellerAudit";
import { notifySeller } from "@/lib/sellerNotifications";
import { getSellerDashboardStats } from "@/lib/sellerOrders";
import { isVerificationComplete } from "@/lib/sellerVerification";

export interface SellerListOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  q?: string;
}

function buildSellerListWhere(options: SellerListOptions = {}) {
  const where: any = {};
  if (options.status && options.status !== "All") {
    where.approvalStatus = options.status;
  }
  const needle = options.q?.trim().toLowerCase();
  if (needle) {
    where.OR = [
      { storeName: { contains: needle, mode: "insensitive" } },
      { ownerName: { contains: needle, mode: "insensitive" } },
      { email: { contains: needle, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function buildSellerList(options: SellerListOptions = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(options.pageSize) || 25));
  const where = buildSellerListWhere(options);

  const [total, sellers] = await Promise.all([
    prisma.sellerProfile.count({ where }),
    prisma.sellerProfile.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true, image: true } }, _count: { select: { products: true, payouts: true } } },
    }),
  ]);

  return {
    total,
    sellers: sellers.map((s) => ({
      id: s.id,
      storeName: s.storeName,
      storeSlug: s.storeSlug,
      ownerName: s.ownerName,
      email: s.email,
      phone: s.phone,
      userId: s.userId,
      approvalStatus: s.approvalStatus,
      businessType: s.businessType,
      createdAt: s.createdAt.toISOString(),
      approvedAt: s.approvedAt?.toISOString() ?? null,
      productCount: s._count.products,
      availableBalance: s.availableBalance,
      pendingBalance: s.pendingBalance,
      totalEarnings: s.totalEarnings,
      totalPaidOut: s.totalPaidOut,
      logo: s.logo,
    })),
  };
}

export async function getSellerDashboard(sellerId: string) {
  const seller = prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    include: { user: { select: { name: true, email: true, image: true } } },
  });
  return seller;
}

export async function getSellerAdminDetail(id: string) {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, accountStatus: true } },
      verification: true,
      products: { include: { product: true }, orderBy: { createdAt: "desc" }, take: 100 },
      payouts: { orderBy: { requestedAt: "desc" }, take: 100 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  return seller;
}

export async function setSellerStatus(input: {
  sellerId: string;
  status: string;
  performedBy?: string;
  reason?: string;
  reasonDetails?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const valid = ["APPROVED", "REJECTED", "UNDER_REVIEW", "SUSPENDED", "BLOCKED", "INACTIVE", "ACTIVE"];
  if (!valid.includes(input.status)) return { ok: false, error: "Invalid status." };

  const seller = await prisma.sellerProfile.findUnique({ where: { id: input.sellerId } });
  if (!seller) return { ok: false, error: "Seller not found." };

  // SERVER-SIDE RULE: a seller cannot be APPROVED until all three mandatory
  // verification items (CNIC, verification images, live video) are VERIFIED.
  if (input.status === "APPROVED") {
    const verification =
      seller.verificationStatus === "VERIFIED"
        ? await prisma.sellerVerification.findUnique({ where: { sellerId: seller.id } })
        : null;
    if (!verification || !isVerificationComplete(verification)) {
      return {
        ok: false,
        error:
          "Seller cannot be approved until identity verification is complete (CNIC, verification images, and live video must all be verified).",
      };
    }
  }

  let action = "";
  switch (input.status) {
    case "APPROVED": action = "SELLER_APPROVED"; break;
    case "REJECTED": action = "SELLER_REJECTED"; break;
    case "SUSPENDED": action = "SELLER_SUSPENDED"; break;
    case "BLOCKED": action = "SELLER_BLOCKED"; break;
    case "INACTIVE": action = "SELLER_ACTIVATED"; break;
    case "UNDER_REVIEW": action = "SELLER_ACTIVATED"; break;
    default: action = "SELLER_ACTIVATED";
  }

  const notify = [
    { status: "APPROVED", title: "Seller Application Approved", message: "Congratulations! Your store is approved. You can now add products." },
    { status: "REJECTED", title: "Seller Application Rejected", message: input.reason ? `Reason: ${input.reason}` : "Your seller application was rejected." },
    { status: "SUSPENDED", title: "Store Suspended", message: "Your store has been suspended. Contact support for details." },
    { status: "BLOCKED", title: "Store Blocked", message: "Your store has been blocked. Contact support." },
    { status: "INACTIVE", title: "Store Deactivated", message: "Your store has been deactivated." },
  ].find((n) => n.status === input.status);

  await prisma.$transaction(async (tx) => {
    await tx.sellerProfile.update({
      where: { id: input.sellerId },
      data: {
        approvalStatus: input.status,
        rejectionReason: input.status === "REJECTED" ? input.reason || null : null,
        blockedAt:
          input.status === "BLOCKED" ? new Date() : input.status === "APPROVED" || input.status === "INACTIVE" ? null : undefined,
        blockedBy: input.status === "BLOCKED" ? input.performedBy || "admin" : undefined,
        blockReason: input.status === "BLOCKED" ? input.reason || null : undefined,
        blockReasonDetails: input.status === "BLOCKED" ? input.reasonDetails || null : undefined,
        approvedAt: input.status === "APPROVED" ? new Date() : undefined,
        approvedBy: input.status === "APPROVED" ? input.performedBy || "admin" : undefined,
      },
    });
    if (input.status === "APPROVED") {
      await tx.user.update({ where: { id: seller.userId }, data: { role: "SELLER" } });
    }
    if (input.status === "REJECTED" || input.status === "BLOCKED" || input.status === "SUSPENDED" || input.status === "INACTIVE") {
      await tx.user.update({ where: { id: seller.userId }, data: { role: "CUSTOMER" } });
    }
  });

  await logSellerAudit({
    sellerId: input.sellerId,
    action,
    performedBy: input.performedBy || "admin",
    details: { reason: input.reason || null, reasonDetails: input.reasonDetails || null },
  });
  if (notify) {
    await notifySeller(input.sellerId, { type: "account", title: notify.title, message: notify.message, link: "/seller" });
  }
  return { ok: true };
}

export async function updateSellerAdmin(
  sellerId: string,
  data: {
    storeName?: string;
    ownerName?: string;
    phone?: string;
    businessType?: string;
    description?: string;
    commissionRate?: number | null;
    adminNotes?: string | null;
  }
) {
  return prisma.sellerProfile.update({ where: { id: sellerId }, data });
}

export async function reviewSellerProduct(
  productId: string,
  status: "APPROVED" | "REJECTED",
  reason?: string,
  performedBy = "admin"
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: { select: { id: true } } },
  });
  if (!product) return { ok: false, error: "Product not found." };
  if (!product.sellerId) return { ok: false, error: "This is a platform product." };

  const next: any = { approvalStatus: status };
  if (status === "REJECTED") {
    next.rejectionReason = reason || "No reason provided";
    next.isActive = false;
  } else {
    next.rejectionReason = null;
    next.isActive = true;
  }
  await prisma.product.update({ where: { id: productId }, data: next });

  await logSellerAudit({
    sellerId: product.sellerId,
    action: status === "APPROVED" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED",
    performedBy,
    target: product.name,
    details: { productId, reason: reason || null },
  });
  await notifySeller(product.sellerId, {
    type: "product",
    title: status === "APPROVED" ? "Product Approved" : "Product Rejected",
    message:
      status === "APPROVED"
        ? `"${product.name}" is now live in your store.`
        : `"${product.name}" was not approved. ${reason ? `Reason: ${reason}` : ""}`,
    link: "/seller/products",
  });
  return { ok: true };
}

export async function processPayoutAdmin(
  payoutId: string,
  status: "APPROVED" | "PROCESSING" | "PAID" | "REJECTED" | "FAILED",
  input: { paymentReference?: string; adminNotes?: string; rejectionReason?: string },
  performedBy = "admin"
) {
  const payout = await prisma.sellerPayout.findUnique({ where: { id: payoutId } });
  if (!payout) return { ok: false, error: "Payout not found." };

  if (status === "PAID") {
    await prisma.$transaction(async (tx) => {
      const p = await tx.sellerProfile.findUnique({ where: { id: payout.sellerId } });
      await tx.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentReference: input.paymentReference || null,
          adminNotes: input.adminNotes || null,
        },
      });
      if (p) {
        await tx.sellerProfile.update({
          where: { id: payout.sellerId },
          data: { totalPaidOut: round2(p.totalPaidOut + payout.amount) },
        });
      }
      await tx.sellerEarning.create({
        data: {
          sellerId: payout.sellerId,
          kind: "PAYOUT",
          gross: 0,
          commission: 0,
          net: round2(-payout.amount),
          balanceAfter: p ? round2(p.availableBalance + p.pendingBalance) : 0,
          note: `Payout ${input.paymentReference || ""}`.trim() || "Payout paid",
        },
      });
    });
    await logSellerAudit({ sellerId: payout.sellerId, action: "PAYOUT_PAID", performedBy, target: payout.id, details: { amount: payout.amount } });
    await notifySeller(payout.sellerId, {
      type: "payout",
      title: "Payout Paid",
      message: `Your payout of Rs ${payout.amount.toLocaleString()} has been paid. ${input.paymentReference ? `Reference: ${input.paymentReference}` : ""}`,
      link: "/seller/payouts",
    });
    return { ok: true };
  }

  if (status === "REJECTED" || status === "FAILED") {
    await prisma.$transaction(async (tx) => {
      await tx.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status,
          rejectionReason: input.rejectionReason || null,
          adminNotes: input.adminNotes || null,
        },
      });
      const p = await tx.sellerProfile.findUnique({ where: { id: payout.sellerId } });
      if (p && payout.status !== "PAID") {
        await tx.sellerProfile.update({
          where: { id: payout.sellerId },
          data: { availableBalance: round2(p.availableBalance + payout.amount) },
        });
      }
    });
    await logSellerAudit({ sellerId: payout.sellerId, action: "PAYOUT_REJECTED", performedBy, target: payout.id, details: { amount: payout.amount } });
    await notifySeller(payout.sellerId, { type: "payout", title: "Payout " + status, message: `Your payout request of Rs ${payout.amount.toLocaleString()} was ${status.toLowerCase()}.${input.rejectionReason ? ` Reason: ${input.rejectionReason}` : ""}` });
    return { ok: true };
  }

  await prisma.sellerPayout.update({
    where: { id: payoutId },
    data: { status, adminNotes: input.adminNotes || null },
  });
  return { ok: true };
}

export async function getMarketplaceAnalytics() {
  const [totalSellers, approvedSellers, pendingSellers, blockedSellers, sellerProducts, pendingProductApprovals, payoutsPending, totalPaidOutData, sellers, topProducts] = await Promise.all([
    prisma.sellerProfile.count(),
    prisma.sellerProfile.count({ where: { approvalStatus: "APPROVED" } }),
    prisma.sellerProfile.count({ where: { approvalStatus: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.sellerProfile.count({ where: { approvalStatus: "BLOCKED" } }),
    prisma.sellerProfileProduct.count(),
    prisma.sellerProfileProduct.count({ where: { product: { approvalStatus: "PENDING_REVIEW" } } }),
    prisma.sellerPayout.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } } }),
    prisma.sellerEarning.aggregate({
      where: { kind: "PAYOUT" },
      _sum: { net: true },
    }),
    prisma.sellerProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      orderBy: { totalEarnings: "desc" },
      take: 8,
      include: { _count: { select: { products: true } } },
    }),
    getSellerTopProducts(),
  ]);

  const gmv = await getMarketplaceGMV();
  const commissionRevenue = await getCommissionRevenue();

  return {
    totalSellers,
    approvedSellers,
    pendingSellers,
    blockedSellers,
    sellerProducts,
    pendingProductApprovals,
    payoutPending: payoutsPending,
    totalPaidOut: totalPaidOutData._sum.net ? Math.abs(totalPaidOutData._sum.net) : 0,
    gmv,
    commissionRevenue,
    topSellers: sellers.map((s) => ({
      id: s.id,
      storeName: s.storeName,
      totalEarnings: s.totalEarnings,
      productCount: s._count.products,
    })),
    topProducts,
  };
}

async function getMarketplaceGMV(): Promise<number> {
  // GMV = sum of each order's total for every distinct order that has at least
  // one seller CREDIT earning. Aggregated entirely in the DB (one query) rather
  // than loading rows and summing per-order in memory.
  const rows = await prisma.$queryRaw<Array<{ total: number | null }>>`
    SELECT COALESCE(SUM(o."total"), 0) AS "total"
    FROM "Order" o
    WHERE EXISTS (
      SELECT 1 FROM "SellerEarning" se
      WHERE se."kind" = 'CREDIT' AND se."orderNo" = o."orderNo"
    )
  `;
  return round2(Number(rows[0]?.total ?? 0));
}

async function getCommissionRevenue(): Promise<number> {
  const agg = await prisma.sellerEarning.aggregate({
    where: { kind: "CREDIT" },
    _sum: { commission: true },
  });
  return round2(agg._sum.commission ?? 0);
}

async function getSellerTopProducts() {
  const rows = await prisma.sellerEarning.findMany({
    where: { kind: "CREDIT" },
    select: { productName: true, net: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const tally: Record<string, number> = {};
  for (const r of rows) {
    if (!r.productName) continue;
    tally[r.productName] = round2((tally[r.productName] || 0) + r.net);
  }
  return Object.entries(tally)
    .map(([name, net]) => ({ name, net }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);
}
