import { NextRequest } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { rateLimit } from "@/lib/rateLimit";
import {
  exportSellerProducts,
  productsToCsv,
  productsToXlsx,
  ExportFilters,
} from "@/lib/sellerExport";

export async function POST(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;

  const limited = rateLimit(req, { windowMs: 60_000, max: 20, label: "seller-export" });
  if (limited) return limited;

  try {
    const body = await req.json();
    const formatArg = String(body.format || "csv").toLowerCase();
    if (formatArg !== "csv" && formatArg !== "xlsx") {
      return new Response(JSON.stringify({ error: "Invalid export format." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filters: ExportFilters = {
      status:
        typeof body.status === "string" && body.status.trim()
          ? String(body.status).slice(0, 50)
          : "ALL",
      category:
        typeof body.category === "string" && body.category.trim()
          ? String(body.category).slice(0, 100)
          : undefined,
      from: typeof body.from === "string" && body.from.trim() ? body.from : undefined,
      to: typeof body.to === "string" && body.to.trim() ? body.to : undefined,
      lowStock: body.lowStock === true,
      outOfStock: body.outOfStock === true,
    };

    const { products, count } = await exportSellerProducts(auth.seller.id, filters);

    const filename = `seller-products-export-${Date.now()}.${formatArg}`;

    if (formatArg === "xlsx") {
      const buf = productsToXlsx(products);
      return new Response(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const csv = productsToCsv(products);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Count": String(count),
      },
    });
  } catch (error) {
    console.error("[SELLER_EXPORT]", error);
    return new Response(
      JSON.stringify({ error: "Export failed. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
