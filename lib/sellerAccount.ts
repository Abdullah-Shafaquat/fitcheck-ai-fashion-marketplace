import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/customerAccount";
import { round2 } from "@/lib/sellerSettings";
import { logSellerAudit } from "@/lib/sellerAudit";
import { getSellerDashboardStats } from "@/lib/sellerOrders";

const SELLER_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "BLOCKED",
  "INACTIVE",
] as const;

export const SELLER_STATUSES_LIST = [...SELLER_STATUSES];

export const BUSINESS_TYPES = [
  "Retail",
  "Wholesale",
  "Handmade",
  "Brand / Manufacturer",
  "Distributor",
  "Other",
] as const;

export function normalizeStoreSlug(name: string, fallback = "store"): string {
  const base = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || fallback).slice(0, 48);
}

/**
 * Returns a serializable public-safe shape of a seller profile.
 */
export function serializeSellerProfile(seller: Record<string, unknown>, includeUser = true) {
  const { user, ...rest } = seller as Record<string, unknown> & { user?: { id?: string; email: string; name: string; image: string | null } };
  return {
    ...rest,
    email: rest.email as string,
    userId: rest.userId as string,
    ...(includeUser && user
      ? { user: { id: user.id ?? rest.userId, name: user.name, email: user.email, image: user.image } }
      : {}),
  };
}

export async function getSellerByUserId(userId: string) {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

export async function getSellerById(id: string) {
  return prisma.sellerProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

export async function getSellerByOrderItemProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: { include: { user: { select: { name: true, image: true, email: true } } } } },
  });
  return product?.seller ?? null;
}

export async function applySeller(input: {
  userId: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone?: string;
  businessType?: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  verificationDoc?: string;
  socialLinks?: Record<string, string>;
  supportContact?: string;
  autoApprove: boolean;
}): Promise<{ ok: true; seller: any } | { ok: false; error: string }> {
  const storeName = String(input.storeName || "").trim();
  const ownerName = String(input.ownerName || "").trim();
  const email = normalizeEmail(input.email);

  if (storeName.length < 2) return { ok: false, error: "Store name must be at least 2 characters." };
  if (ownerName.length < 2) return { ok: false, error: "Owner name must be at least 2 characters." };
  if (!email) return { ok: false, error: "A valid email is required." };

  const existingByUser = await prisma.sellerProfile.findUnique({ where: { userId: input.userId } });
  if (existingByUser) {
    return { ok: false, error: "You have already submitted a seller application." };
  }

  let storeSlug = normalizeStoreSlug(storeName);
  let taken = await prisma.sellerProfile.findUnique({ where: { storeSlug } });
  let counter = 1;
  while (taken) {
    storeSlug = `${normalizeStoreSlug(storeName)}-${counter}`;
    taken = await prisma.sellerProfile.findUnique({ where: { storeSlug } });
    counter++;
  }

  // NOTE: A seller is never approved at application time. Marketplace rules
  // require identity verification (CNIC images + live video) to be completed and
  // admin-verified BEFORE a seller can be approved. Auto-approve therefore does
  // not short-circuit verification here — it is applied only once verification
  // is complete (see reviewVerificationItem / promoteSellerIfAutoApprovable).
  const status = "PENDING";

  const seller = await prisma.sellerProfile.create({
    data: {
      userId: input.userId,
      storeName,
      storeSlug,
      ownerName,
      email,
      phone: input.phone?.trim() || null,
      businessType: input.businessType || null,
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      province: input.province?.trim() || null,
      country: input.country || "Pakistan",
      verificationDoc: input.verificationDoc?.trim() || null,
      socialLinks: input.socialLinks || {},
      supportContact: input.supportContact?.trim() || null,
      approvalStatus: status,
      approvedAt: null,
      approvedBy: null,
    },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  await logSellerAudit({
    sellerId: seller.id,
    action: "SELLER_APPLIED",
    performedBy: input.userId,
    details: { storeName },
  });

  return { ok: true, seller };
}

export async function sellerSummary(sellerId: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return null;

  const [totalProducts, activeProducts, outOfStock, lowStock, stats] = await Promise.all([
    prisma.product.count({ where: { sellerId } }),
    prisma.product.count({ where: { sellerId, isActive: true, approvalStatus: "APPROVED" } }),
    prisma.product.count({ where: { sellerId, stock: { lte: 0 } } }),
    prisma.product
      .findMany({
        where: { sellerId, stock: { gt: 0 } },
        select: { id: true, name: true, stock: true, lowStockThreshold: true },
        orderBy: { stock: "asc" },
        take: 200,
      })
      .then((rows) =>
        rows
          .filter((p) => p.stock <= (p.lowStockThreshold ?? 5))
          .slice(0, 10)
      ),
    getSellerDashboardStats(sellerId),
  ]);

  return {
    seller,
    totalProducts,
    activeProducts,
    outOfStock,
    lowStock,
    availableBalance: seller.availableBalance,
    pendingBalance: seller.pendingBalance,
    totalEarnings: seller.totalEarnings,
    totalPaidOut: seller.totalPaidOut,
    stats,
  };
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
