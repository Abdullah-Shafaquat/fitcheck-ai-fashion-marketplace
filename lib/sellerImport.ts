import prisma from "@/lib/prisma";
import { coerceImportRow, FORBIDDEN_IMPORT_COLUMNS } from "@/lib/sellerImportExport";
import { getAutoApproveProducts } from "@/lib/sellerSettings";
import { logSellerAudit, SellerAuditAction } from "@/lib/sellerAudit";
import { notifySeller } from "@/lib/sellerNotifications";

export const IMPORT_MAX_ROWS = 1000;
export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface ImportRowResult {
  rowNo: number;
  errors: string[];
  warnings: string[];
  /** normalized, safe values (ownership fields already removed) */
  data: Record<string, unknown> | null;
}

export interface ImportValidationResult {
  format: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  rows: ImportRowResult[];
}

export interface ImportExecutionResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  approvalStatus: string;
}

function makeSlug(name: string, fallback = "product"): string {
  const base = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || fallback).slice(0, 80);
}

function isValidTextUrl(v: string): boolean {
  const s = v.trim();
  if (/^https?:\/\/[^\s]+$/i.test(s)) return true;
  if (s.startsWith("/") && !/^\/(\/|\\)/.test(s)) return true; // allow relative root paths
  return false;
}

/**
 * Validate an entire file's rows BEFORE any write. Detects ownership tampering,
 * duplicate SKUs within the file, invalid types, negatives, bad URLs, oversized
 * text and other abuse. Never writes to the database.
 */
export function validateImportRows(rawRows: Record<string, unknown>[]): ImportValidationResult {
  const rows: ImportRowResult[] = [];
  const seenSkus = new Map<string, number>();
  const seenSlugs = new Map<string, number>();
  let valid = 0;
  let invalid = 0;
  let duplicates = 0;
  let warnings = 0;

  rawRows.forEach((raw, idx) => {
    const rowNo = idx + 2; // +1 for the header row, +1 because rows are 1-based
    const errors: string[] = [];
    const warningsArr: string[] = [];

    // Detect ownership/privilege tampering that we already stripped but must surface.
    const forbiddenKeys = Object.keys(raw).filter((k) =>
      [...FORBIDDEN_IMPORT_COLUMNS].includes(k.toLowerCase().replace(/[^a-z0-9]+/g, ""))
    );

    const co = coerceImportRow(raw);
    warningsArr.push(...co.warnings);
    const d = co.value;

    if (forbiddenKeys.length > 0) {
      warningsArr.push(
        `Ignored restricted field(s): ${forbiddenKeys.join(", ")} (ownership is set automatically)`
      );
    }

    // Required
    if (!d.name || String(d.name).trim().length < 2) {
      errors.push("Product name is required (min 2 characters).");
    } else if (String(d.name).trim().length > 200) {
      errors.push("Product name must be 200 characters or fewer.");
    }

    const price = d.price as number | null;
    if (price === null || !Number.isFinite(price) || price <= 0) {
      errors.push("Price must be a number greater than zero.");
    }

    const oldPrice = d.oldPrice as number | null;
    if (oldPrice !== null && oldPrice !== undefined && (!Number.isFinite(oldPrice) || oldPrice < 0)) {
      errors.push("Old Price must be zero or a positive number.");
    }
    if (
      price !== null &&
      oldPrice !== null &&
      oldPrice !== undefined &&
      price > oldPrice &&
      oldPrice > 0
    ) {
      warningsArr.push("Old Price is lower than Price.");
    }

    if (!d.category || String(d.category).trim() === "") {
      errors.push("Category is required.");
    }
    if (!d.gender || String(d.gender).trim() === "") {
      errors.push("Gender is required.");
    }

    const stock = d.stock as number | null;
    if (stock === null || stock === undefined) {
      d.stock = 0;
    } else if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      errors.push("Stock must be a whole number greater than or equal to zero.");
    }

    const lowStock = d.lowStockThreshold as number | null;
    if (lowStock !== null && lowStock !== undefined && (!Number.isFinite(lowStock) || lowStock < 0)) {
      errors.push("Low Stock Threshold must be a positive number.");
    }

    // Slug safety
    let slug = String(d.slug || "").trim();
    if (slug) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        errors.push("Slug may only contain lowercase letters, numbers and dashes.");
      }
    } else {
      slug = makeSlug(String(d.name || ""));
    }
    d.slug = slug;
    if (seenSlugs.has(slug)) {
      const msg = `Duplicate slug "${slug}" (also on row ${seenSlugs.get(slug)}).`;
      if (!errors.includes(msg)) errors.push(msg);
      duplicates++;
    } else {
      seenSlugs.set(slug, rowNo);
    }

    // SKU uniqueness within file
    const sku = String(d.sku || "").trim() || null;
    if (sku) {
      if (sku.length > 100) errors.push("SKU must be 100 characters or fewer.");
      if (seenSkus.has(sku.toLowerCase())) {
        const msg = `Duplicate SKU "${sku}" (also on row ${seenSkus.get(sku.toLowerCase())}).`;
        if (!errors.includes(msg)) errors.push(msg);
        duplicates++;
      } else {
        seenSkus.set(sku.toLowerCase(), rowNo);
      }
    }

    // Array fields
    for (const key of ["sizes", "colors", "images"] as const) {
      const arr = (d[key] as string[]) || [];
      if (arr.length > 50) {
        errors.push(`${key === "images" ? "Images" : key} exceeds 50 entries.`);
      }
      if (key === "images") {
        const bad = arr.filter((u) => !isValidTextUrl(u));
        if (bad.length) {
          errors.push(`Invalid image URL: "${bad[0]}". Use http(s) or a leading "/" path.`);
        }
      }
      const dupSet = new Set(arr.map((x) => x.toLowerCase()));
      if (dupSet.size !== arr.length) warningsArr.push(`${key} contains duplicates.`);
    }

    // Boolean coercion: if provided value is not a valid boolean, flag it.
    for (const key of ["featured", "latestArrival", "isActive"] as const) {
      const v = d[key];
      if (v !== null && v !== undefined && typeof v !== "boolean") {
        warningsArr.push(`${key} should be true/false (used "${String(v)}").`);
      }
    }

    if (warningsArr.length) warnings += warningsArr.length;

    if (errors.length > 0) {
      invalid++;
      rows.push({ rowNo, errors, warnings: warningsArr, data: null });
      return;
    }

    valid++;
    rows.push({
      rowNo,
      errors: [],
      warnings: warningsArr,
      data: {
        name: String(d.name).trim(),
        slug: String(d.slug),
        description: String(d.description || "").slice(0, 8000),
        price: price as number,
        oldPrice: (d.oldPrice as number) || null,
        category: String(d.category).trim().slice(0, 100),
        subCategory: d.subCategory ? String(d.subCategory).trim().slice(0, 100) : null,
        gender: String(d.gender).trim().slice(0, 50),
        sizes: (d.sizes as string[]) || [],
        colors: (d.colors as string[]) || [],
        images: (d.images as string[]) || [],
        colorImages: (d.colorImages as Record<string, string>) || {},
        stock: Number(d.stock) || 0,
        sku: sku,
        badge: d.badge ? String(d.badge).trim().slice(0, 100) : null,
        featured: d.featured === true,
        latestArrival: d.latestArrival === true,
        isActive: d.isActive === true,
        lowStockThreshold: Number(d.lowStockThreshold) || 5,
      },
    });
  });

  return { format: "", total: rows.length, valid, invalid, duplicates, warnings, rows };
}

/**
 * Perform an actual import from VALIDATED rows only. The authenticated sellerId
 * is set server-side and is never taken from file/browser input. Products follow
 * the marketplace approval rule (auto-approve setting). Rows whose SKU already
 * exists in the DB for the same seller are skipped as duplicates so repeated
 * uploads cannot create duplicated products.
 */
export async function performSellerImport(
  sellerId: string,
  validatedRows: ImportRowResult[],
  opts: { skipExistingSkus?: boolean } = {}
): Promise<ImportExecutionResult> {
  const autoApprove = await getAutoApproveProducts();
  const approvalStatus = autoApprove ? "APPROVED" : "PENDING_REVIEW";
  const isActive = approvalStatus === "APPROVED";

  const goodRows = validatedRows.filter((r) => r.data);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of goodRows) {
      const data = row.data!;
      const name = String(data.name || "");
      const desiredSlug = String(data.slug || makeSlug(name));
      const rawSku = data.sku ? String(data.sku).trim() : null;

      // If the same SKU already belongs to THIS seller -> skip (duplicate import
      // within this seller's own catalog). SKUs owned by other sellers or the
      // platform are NOT treated as this seller's duplicates — conflicts are
      // resolved by auto-generating a unique SKU below, matching createSellerProduct.
      if (rawSku && opts.skipExistingSkus !== false) {
        const existingSku = await tx.product.findFirst({
          where: { sku: rawSku, sellerId },
        });
        if (existingSku) {
          skipped++;
          continue;
        }
      }

      // Unique slug resolution (like createSellerProduct).
      let slug = desiredSlug;
      let taken = await tx.product.findUnique({ where: { slug } });
      let counter = 1;
      while (taken) {
        slug = `${makeSlug(name)}-${counter}`;
        taken = await tx.product.findUnique({ where: { slug } });
        counter++;
      }

      let sku = rawSku;
      let created: any = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          created = await tx.product.create({
            data: {
              name,
              slug,
              description: String(data.description || ""),
              price: Number(data.price),
              oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
              category: String(data.category),
              subCategory: data.subCategory ? String(data.subCategory) : null,
              gender: String(data.gender),
              sizes: (data.sizes as string[]) || [],
              colors: (data.colors as string[]) || [],
              images:
                (data.images as string[]) && (data.images as string[]).length
                  ? (data.images as string[])
                  : ["/images/placeholder.jpg"],
              colorImages: (data.colorImages as Record<string, string>) || {},
              stock: Math.max(0, Math.floor(Number(data.stock) || 0)),
              sku,
              productOwnerType: "SELLER",
              sellerId,
              approvalStatus,
              isActive,
              lowStockThreshold: Math.max(0, Math.floor(Number(data.lowStockThreshold) || 5)),
            },
          });
          break;
        } catch (err: any) {
          const isSkuConflict =
            err?.code === "P2002" &&
            Array.isArray(err?.meta?.target) &&
            (err.meta.target as string[]).includes("sku");
          if (!isSkuConflict || attempt >= 5) {
            failed++;
            created = null;
            break;
          }
          const base = (sku || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "product";
          sku = `${base}-${Date.now().toString(36)}${attempt}`;
        }
      }
      if (!created) continue;
      await tx.sellerProfileProduct.create({
        data: { sellerId, productId: created.id },
      });
      imported++;
    }
  });

  await logSellerAudit({
    sellerId,
    action: "SELLER_IMPORT_COMPLETED" as SellerAuditAction,
    performedBy: sellerId,
    target: "product-import",
    details: { imported, skipped, failed, total: goodRows.length, approvalStatus },
  });

  if (imported > 0) {
    await notifySeller(sellerId, {
      type: "import",
      title: "Product Import Completed",
      message:
        failed > 0
          ? `${imported} products imported. ${failed} row${failed !== 1 ? "s" : ""} require correction.`
          : `${imported} product${imported !== 1 ? "s" : ""} imported successfully.`,
      link: "/seller/products",
    });
  }

  return { total: goodRows.length, imported, skipped, failed, approvalStatus };
}
