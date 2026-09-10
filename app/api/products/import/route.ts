import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyAdmin } from "@/lib/notify";

interface ProductRow {
  name?: string;
  price?: number;
  oldPrice?: number | null;
  category?: string;
  subCategory?: string;
  gender?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  images?: string[];
  colorImages?: Record<string, string> | string;
  stock?: number;
  sku?: string;
  badge?: string;
  featured?: boolean;
  latestArrival?: boolean;
  isActive?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const products: ProductRow[] = Array.isArray(body.products) ? body.products : [];

    if (products.length === 0) {
      return NextResponse.json({ error: "No products provided" }, { status: 400 });
    }

    if (products.length > 5000) {
      return NextResponse.json({ error: "Maximum 5000 products per import" }, { status: 400 });
    }

    let imported = 0;
    const updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      const rowNum = i + 1;

      try {
        if (!row.name || typeof row.name !== "string" || !row.name.trim()) {
          errors.push(`Row ${rowNum}: Missing product name`);
          skipped++;
          continue;
        }

        if (typeof row.price !== "number" || row.price <= 0) {
          errors.push(`Row ${rowNum}: Invalid price for "${row.name}"`);
          skipped++;
          continue;
        }

        if (!row.category || typeof row.category !== "string") {
          errors.push(`Row ${rowNum}: Missing category for "${row.name}"`);
          skipped++;
          continue;
        }

        if (!row.gender || typeof row.gender !== "string") {
          errors.push(`Row ${rowNum}: Missing gender for "${row.name}"`);
          skipped++;
          continue;
        }

        let slug = slugify(row.name);
        let existing = await prisma.product.findUnique({ where: { slug } });
        let counter = 1;
        while (existing) {
          slug = `${slugify(row.name)}-${counter}`;
          existing = await prisma.product.findUnique({ where: { slug } });
          counter++;
        }

        let sku: string | null = row.sku ? String(row.sku).trim() : null;
        if (sku) {
          const existingSku = await prisma.product.findUnique({ where: { sku } });
          if (existingSku) {
            const base = slugify(row.name).slice(0, 40) || "product";
            sku = `${base}-${Date.now().toString(36)}${i}`;
          }
        }

        const productData = {
          name: row.name.trim(),
          slug,
          description: row.description || "",
          price: row.price,
          oldPrice: row.oldPrice || null,
          category: row.category,
          subCategory: row.subCategory || null,
          gender: row.gender,
          sizes: Array.isArray(row.sizes) ? row.sizes : [],
          colors: Array.isArray(row.colors) ? row.colors : [],
          images: Array.isArray(row.images) && row.images.length > 0 ? row.images : ["/images/placeholder.jpg"],
          colorImages: typeof row.colorImages === "object" && row.colorImages !== null
            ? row.colorImages
            : typeof row.colorImages === "string" && row.colorImages.trim()
              ? (() => { try { return JSON.parse(row.colorImages); } catch { return {}; } })()
              : {},
          stock: typeof row.stock === "number" ? row.stock : 0,
          sku,
          badge: row.badge || null,
          featured: typeof row.featured === "boolean" ? row.featured : false,
          latestArrival: typeof row.latestArrival === "boolean" ? row.latestArrival : false,
          isActive: typeof row.isActive === "boolean" ? row.isActive : true,
        };

        await prisma.product.create({ data: productData });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${msg}`);
        skipped++;
      }
    }

    if (imported > 0) {
      await notifyAdmin({
        type: "import",
        title: "Import Completed",
        message: `${imported} product${imported !== 1 ? "s" : ""} imported${skipped > 0 ? `, ${skipped} skipped` : ""}`,
        link: "/admin/products",
      });
    }

    return NextResponse.json({
      imported,
      updated,
      skipped,
      errors,
      total: products.length,
    });
  } catch (error) {
    console.error("[PRODUCTS_IMPORT]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
