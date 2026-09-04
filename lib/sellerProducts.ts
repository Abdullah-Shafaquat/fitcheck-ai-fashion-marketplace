import prisma from "@/lib/prisma";
import { getAutoApproveProducts } from "@/lib/sellerSettings";
import { logSellerAudit } from "@/lib/sellerAudit";
import { notifySeller } from "@/lib/sellerNotifications";

export interface SellerProductInput {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  oldPrice?: number | null;
  category: string;
  subCategory?: string;
  gender: string;
  sizes?: string[];
  colors?: string[];
  images?: string[];
  colorImages?: Record<string, string>;
  stock?: number;
  sku?: string;
  lowStockThreshold?: number;
  inventory?: unknown;
  approvalStatus?: string; // DRAFT | PENDING_REVIEW | APPROVED
}

function makeSlug(name: string, fallback = "product"): string {
  const base = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || fallback).slice(0, 80);
}

/**
 * Creates a seller-owned product. If auto-approve is off it goes to
 * PENDING_REVIEW; otherwise APPROVED and instantly active.
 */
export async function createSellerProduct(
  sellerId: string,
  input: SellerProductInput
): Promise<{ ok: true; product: any } | { ok: false; error: string }> {
  const name = String(input.name || "").trim();
  if (name.length < 2) return { ok: false, error: "Product name is required." };
  if (!Number.isFinite(Number(input.price)) || Number(input.price) <= 0) {
    return { ok: false, error: "Price must be a positive number." };
  }
  if (!input.category || !input.gender) {
    return { ok: false, error: "Category and gender are required." };
  }

  let slug = makeSlug(input.slug || name);
  let taken = await prisma.product.findUnique({ where: { slug } });
  let counter = 1;
  while (taken) {
    slug = `${makeSlug(input.slug || name)}-${counter}`;
    taken = await prisma.product.findUnique({ where: { slug } });
    counter++;
  }

  const autoApprove = await getAutoApproveProducts();
  const approvalStatus = autoApprove ? "APPROVED" : "PENDING_REVIEW";

  let sku = String(input.sku || "").trim() || null;

  const product = await prisma.$transaction(async (tx) => {
    let created: any;
    for (let attempt = 0; ; attempt++) {
      try {
        created = await tx.product.create({
          data: {
            name,
            slug,
            description: input.description || "",
            price: Number(input.price),
            oldPrice: input.oldPrice ? Number(input.oldPrice) : null,
            category: input.category,
            subCategory: input.subCategory || null,
            gender: input.gender,
            sizes: input.sizes || [],
            colors: input.colors || [],
            images: input.images && input.images.length ? input.images : ["/images/placeholder.jpg"],
            colorImages: input.colorImages || {},
            stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
            sku,
            productOwnerType: "SELLER",
            sellerId,
            approvalStatus,
            isActive: approvalStatus === "APPROVED",
            lowStockThreshold: Math.max(0, Math.floor(Number(input.lowStockThreshold) || 5)),
            inventory: input.inventory ?? undefined,
          },
        });
        break;
      } catch (err: any) {
        const isSkuConflict =
          err?.code === "P2002" &&
          Array.isArray(err?.meta?.target) &&
          (err.meta.target as string[]).includes("sku");
        if (!isSkuConflict || attempt >= 5) throw err;
        const base = (sku || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "product";
        sku = `${base}-${Date.now().toString(36)}${attempt}`;
      }
    }
    await tx.sellerProfileProduct.create({
      data: { sellerId, productId: created.id },
    });
    return created;
  });

  await logSellerAudit({
    sellerId,
    action: "SELLER_PRODUCT_CREATED",
    performedBy: sellerId,
    target: product.name,
    details: { productId: product.id, approvalStatus },
  });

  return { ok: true, product };
}

export async function updateSellerProduct(
  sellerId: string,
  productId: string,
  input: Partial<SellerProductInput>
): Promise<{ ok: true; product: any } | { ok: false; error: string }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Product not found." };
  if (product.sellerId !== sellerId) {
    return { ok: false, error: "You cannot modify this product." };
  }

  const data: any = { updatedAt: new Date() };
  if (input.name !== undefined) data.name = String(input.name).trim();
  if (input.description !== undefined) data.description = String(input.description).trim();
  if (input.price !== undefined) {
    if (!Number.isFinite(Number(input.price)) || Number(input.price) <= 0) {
      return { ok: false, error: "Price must be positive." };
    }
    data.price = Number(input.price);
  }
  if (input.oldPrice !== undefined) data.oldPrice = input.oldPrice ? Number(input.oldPrice) : null;
  if (input.category !== undefined) data.category = input.category;
  if (input.subCategory !== undefined) data.subCategory = input.subCategory || null;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.sizes !== undefined) data.sizes = input.sizes || [];
  if (input.colors !== undefined) data.colors = input.colors || [];
  if (input.images !== undefined) data.images = input.images?.length ? input.images : ["/images/placeholder.jpg"];
  if (input.colorImages !== undefined) data.colorImages = input.colorImages || {};
  if (input.stock !== undefined) data.stock = Math.max(0, Math.floor(Number(input.stock) || 0));
  if (input.sku !== undefined && String(input.sku).trim()) data.sku = String(input.sku).trim();
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = Math.max(0, Math.floor(Number(input.lowStockThreshold) || 5));
  if (input.inventory !== undefined) data.inventory = input.inventory;
  if (input.approvalStatus === "DRAFT" || input.approvalStatus === "PENDING_REVIEW") {
    data.approvalStatus = input.approvalStatus;
    data.isActive = false;
  }

  const updated = await prisma.product.update({ where: { id: productId }, data });
  await logSellerAudit({
    sellerId,
    action: "SELLER_PRODUCT_UPDATED",
    performedBy: sellerId,
    target: updated.name,
    details: { productId },
  });
  return { ok: true, product: updated };
}

export async function deleteSellerProduct(
  sellerId: string,
  productId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Product not found." };
  if (product.sellerId !== sellerId) {
    return { ok: false, error: "You cannot delete this product." };
  }
  await prisma.$transaction([
    prisma.sellerProfileProduct.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);
  await logSellerAudit({
    sellerId,
    action: "SELLER_PRODUCT_DELETED",
    performedBy: sellerId,
    target: product.name,
    details: { productId },
  });
  return { ok: true };
}

export async function submitSellerProductForReview(
  sellerId: string,
  productId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { ok: false, error: "Product not found." };
  if (product.sellerId !== sellerId) return { ok: false, error: "Unauthorized." };
  if (product.approvalStatus === "APPROVED") return { ok: true };
  await prisma.product.update({
    where: { id: productId },
    data: { approvalStatus: "PENDING_REVIEW", isActive: false, rejectionReason: null },
  });
  await logSellerAudit({
    sellerId,
    action: "PRODUCT_SUBMITTED",
    performedBy: sellerId,
    target: product.name,
    details: { productId },
  });
  return { ok: true };
}

export async function listSellerProducts(sellerId: string, filter?: string) {
  const where: any = { sellerId };
  if (filter && filter !== "All" && filter !== "ALL") {
    if (filter === "Active") where.isActive = true;
    else if (filter === "Draft") where.approvalStatus = "DRAFT";
    else if (filter === "Pending") where.approvalStatus = "PENDING_REVIEW";
    else if (filter === "Rejected") where.approvalStatus = "REJECTED";
  }
  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { storeName: true } } },
  });
}
