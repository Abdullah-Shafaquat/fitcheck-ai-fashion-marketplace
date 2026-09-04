import prisma from "@/lib/prisma";
import { IMPORT_COLUMNS } from "@/lib/sellerImportExport";
import { logSellerAudit, SellerAuditAction } from "@/lib/sellerAudit";
import * as XLSX from "xlsx";

export const EXPORT_MAX_ROWS = 5000;

/** Whitelisted export filters. All are additionally scoped to the seller. */
export interface ExportFilters {
  status?: string; // ALL | ACTIVE | INACTIVE | APPROVED | PENDING_REVIEW | REJECTED | DRAFT
  category?: string;
  from?: string;
  to?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}

const ALLOWED_STATUS = new Set([
  "ALL",
  "ACTIVE",
  "INACTIVE",
  "APPROVED",
  "PENDING_REVIEW",
  "REJECTED",
  "DRAFT",
]);

/**
 * Protected spreadsheet-export escaping for CSV/XLSX formula injection.
 * Strings that begin with = + - @ (or tab / CR) are prefixed with a single quote
 * so opening the file in Excel/Sheets never executes them. Numbers/booleans are
 * left as native values.
 */
function formulaSafe(v: unknown): unknown {
  if (typeof v !== "string") return v;
  if (/^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return v;
}

export function buildExportWhere(sellerId: string, filters: ExportFilters) {
  const where: any = { sellerId };

  if (filters.category && typeof filters.category === "string" && filters.category.trim()) {
    where.category = filters.category.trim().slice(0, 100);
  }

  const status = (filters.status || "ALL").toUpperCase();
  if (ALLOWED_STATUS.has(status)) {
    if (status === "ACTIVE") where.isActive = true;
    else if (status === "INACTIVE") where.isActive = false;
    else if (status === "APPROVED") where.approvalStatus = "APPROVED";
    else if (status === "PENDING_REVIEW") where.approvalStatus = "PENDING_REVIEW";
    else if (status === "REJECTED") where.approvalStatus = "REJECTED";
    else if (status === "DRAFT") where.approvalStatus = "DRAFT";
  }

  if (filters.outOfStock === true) {
    where.stock = { lte: 0 };
  }

  if (filters.from || filters.to) {
    const gte = filters.from ? new Date(filters.from) : null;
    const lte = filters.to ? new Date(filters.to) : null;
    if (gte && !Number.isNaN(gte.getTime())) where.createdAt = { ...where.createdAt, gte };
    if (lte && !Number.isNaN(lte.getTime())) where.createdAt = { ...where.createdAt, lte };
  }

  return where;
}

/**
 * Export ONLY the authenticated seller's products. The sellerId is passed in
 * from the authenticated server-side session, never from the browser.
 */
export async function exportSellerProducts(
  sellerId: string,
  filters: ExportFilters
): Promise<{ products: any[]; format: string; count: number }> {
  const where = buildExportWhere(sellerId, filters);
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: EXPORT_MAX_ROWS,
  });

  // Low-stock is a column-to-column comparison, so filter it in memory.
  let scoped = products;
  if (filters.lowStock === true) {
    scoped = products.filter(
      (p) => p.stock <= (p.lowStockThreshold ?? 5) && p.stock > 0
    );
  }

  await logSellerAudit({
    sellerId,
    action: "SELLER_EXPORT_CREATED" as SellerAuditAction,
    performedBy: sellerId,
    target: "product-export",
    details: { count: scoped.length, filters: safeFilterSummary(filters) },
  });

  return { products: scoped, format: "csv", count: scoped.length };
}

function safeFilterSummary(f: ExportFilters): Record<string, unknown> {
  return {
    status: f.status || "ALL",
    category: f.category || null,
    from: f.from || null,
    to: f.to || null,
    lowStock: f.lowStock || false,
    outOfStock: f.outOfStock || false,
  };
}

const EXPORT_HEADERS: { key: string; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "description", label: "Description" },
  { key: "price", label: "Price" },
  { key: "oldPrice", label: "Old Price" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub Category" },
  { key: "gender", label: "Gender" },
  { key: "sizes", label: "Sizes" },
  { key: "colors", label: "Colors" },
  { key: "images", label: "Images" },
  { key: "colorImages", label: "Color Images" },
  { key: "stock", label: "Stock" },
  { key: "sku", label: "SKU" },
  { key: "badge", label: "Badge" },
  { key: "featured", label: "Featured" },
  { key: "latestArrival", label: "Latest Arrival" },
  { key: "isActive", label: "Is Active" },
  { key: "approvalStatus", label: "Approval Status" },
  { key: "lowStockThreshold", label: "Low Stock Threshold" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedAt", label: "Updated At" },
];

function toRow(p: any): Record<string, unknown> {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description || "",
    price: p.price,
    oldPrice: p.oldPrice ?? "",
    category: p.category,
    subCategory: p.subCategory || "",
    gender: p.gender,
    sizes: (p.sizes || []).join(","),
    colors: (p.colors || []).join(","),
    images: (p.images || []).join(","),
    colorImages: p.colorImages && typeof p.colorImages === "object"
      ? JSON.stringify(p.colorImages)
      : "",
    stock: p.stock,
    sku: p.sku || "",
    badge: p.badge || "",
    featured: p.featured,
    latestArrival: p.latestArrival,
    isActive: p.isActive,
    approvalStatus: p.approvalStatus,
    lowStockThreshold: p.lowStockThreshold,
    createdAt: p.createdAt?.toISOString() || "",
    updatedAt: p.updatedAt?.toISOString() || "",
  };
}

/** Produce an RFC-4180-safe CSV string with formula-injection escaping. */
export function productsToCsv(products: any[]): string {
  const esc = (v: unknown): string => {
    const safe = formulaSafe(v);
    let s = safe === null || safe === undefined ? "" : String(safe);
    if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines: string[] = [EXPORT_HEADERS.map((h) => esc(h.label)).join(",")];
  for (const p of products) {
    const row = toRow(p);
    lines.push(EXPORT_HEADERS.map((h) => esc(row[h.key])).join(","));
  }
  return lines.join("\r\n");
}

/** Produce an XLSX buffer with formula-injection safety. */
export function productsToXlsx(products: any[]): Buffer {
  const data = products.map((p) => {
    const row = toRow(p);
    const out: Record<string, unknown> = {};
    for (const h of EXPORT_HEADERS) out[h.label] = formulaSafe(row[h.key]);
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: EXPORT_HEADERS.map((h) => h.label) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Builds the import template headers/rows (for the downloadable template). */
export function importTemplateHeaders(): string[] {
  return IMPORT_COLUMNS.map((c) => c.label);
}
