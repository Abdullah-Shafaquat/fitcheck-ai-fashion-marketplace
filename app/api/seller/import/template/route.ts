import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { importTemplateHeaders } from "@/lib/sellerExport";

export async function GET(req: Request) {
  const auth = await requireSeller(req as any);
  if (auth.response) return auth.response;

  const headers = importTemplateHeaders();
  const sample = [
    {
      name: "Premium Hoodie",
      slug: "",
      description: "Comfortable oversized hoodie",
      price: "5999",
      oldPrice: "7999",
      category: "Clothing",
      subCategory: "Hoodies",
      gender: "Unisex",
      sizes: "S,M,L,XL",
      colors: "Black,White",
      images: "https://example.com/a.jpg,https://example.com/b.jpg",
      colorImages: '{"Black":"https://example.com/black.jpg"}',
      stock: "20",
      sku: "TEST-HOODIE-001",
      badge: "Featured",
      featured: "true",
      latestArrival: "false",
      isActive: "true",
      lowStockThreshold: "5",
    },
  ];

  const esc = (v: string): string => {
    let s = typeof v === "string" ? v : String(v || "");
    if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@")) {
      s = `'${s}`;
    }
    if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.map(esc).join(",")];
  for (const row of sample) {
    lines.push(headers.map((h) => esc(String((row as any)[h] ?? ""))).join(","));
  }
  const csv = lines.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seller-product-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
