import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { rateLimit } from "@/lib/rateLimit";
import { validateImportRows, performSellerImport } from "@/lib/sellerImport";
import { logSellerAudit } from "@/lib/sellerAudit";

/** Maximum rows the confirm endpoint will accept in one request. */
const CONFIRM_MAX_ROWS = 1000;

export async function POST(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;

  const limited = rateLimit(req, { windowMs: 60_000, max: 10, label: "seller-import-confirm" });
  if (limited) return limited;

  try {
    const body = await req.json();
    const rawRows: Record<string, unknown>[] = Array.isArray(body.rows) ? body.rows : [];
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No import rows provided." }, { status: 400 });
    }
    if (rawRows.length > CONFIRM_MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${CONFIRM_MAX_ROWS} rows per import.` },
        { status: 400 }
      );
    }

    // Re-validate EVERYTHING server-side. Never trust a client-supplied "valid" flag.
    const validation = validateImportRows(rawRows);
    if (validation.invalid > 0) {
      return NextResponse.json(
        {
          error: `${validation.invalid} row(s) failed validation and were not imported. Fix and re-upload.`,
          invalid: validation.invalid,
        },
        { status: 400 }
      );
    }

    await logSellerAudit({
      sellerId: auth.seller.id,
      action: "SELLER_IMPORT_STARTED",
      performedBy: auth.seller.id,
      target: "product-import",
      details: { total: validation.total },
    });

    const result = await performSellerImport(auth.seller.id, validation.rows, {
      skipExistingSkus: true,
    });

    return NextResponse.json({
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      approvalStatus: result.approvalStatus,
    });
  } catch (error) {
    console.error("[SELLER_IMPORT_CONFIRM]", error);
    await logSellerAudit({
      sellerId: auth.seller.id,
      action: "SELLER_IMPORT_FAILED",
      performedBy: auth.seller.id,
      target: "product-import",
      details: { reason: "unexpected_error" },
    }).catch(() => {});
    return NextResponse.json({ error: "Import failed. Please try again." }, { status: 500 });
  }
}
