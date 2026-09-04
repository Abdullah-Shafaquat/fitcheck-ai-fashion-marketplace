import { NextRequest, NextResponse } from "next/server";
import { requireSeller } from "@/lib/seller-auth";
import { rateLimit } from "@/lib/rateLimit";
import {
  parseSpreadsheet,
  FORBIDDEN_IMPORT_COLUMNS,
} from "@/lib/sellerImportExport";
import {
  validateImportRows,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
} from "@/lib/sellerImport";

export async function POST(req: NextRequest) {
  const auth = await requireSeller(req);
  if (auth.response) return auth.response;

  const limited = rateLimit(req, { windowMs: 60_000, max: 15, label: "seller-import" });
  if (limited) return limited;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .csv or .xlsx file." },
        { status: 400 }
      );
    }

    if (file.size > IMPORT_MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let parsed: { rows: Record<string, unknown>[]; headers: string[] };
    try {
      parsed = parseSpreadsheet(buffer, file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not parse file.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: "The file contains no data rows." }, { status: 400 });
    }
    if (parsed.rows.length > IMPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: `Maximum ${IMPORT_MAX_ROWS} rows per import. Your file has ${parsed.rows.length}.` },
        { status: 400 }
      );
    }

    const result = validateImportRows(parsed.rows);

    // Return only safe, non-secret preview data (no internal DB info).
    return NextResponse.json({
      format: ext,
      fileName: file.name,
      total: result.total,
      valid: result.valid,
      invalid: result.invalid,
      duplicates: result.duplicates,
      warnings: result.warnings,
      rows: result.rows.map((r) => ({
        rowNo: r.rowNo,
        errors: r.errors,
        warnings: r.warnings,
        data: r.data ?? null,
      })),
      forbiddenColumnsPresent: parsed.headers.some((h) =>
        [...FORBIDDEN_IMPORT_COLUMNS].includes(h.toLowerCase().replace(/[^a-z0-9]+/g, ""))
      ),
    });
  } catch (error) {
    console.error("[SELLER_IMPORT_VALIDATE]", error);
    return NextResponse.json({ error: "Import validation failed." }, { status: 500 });
  }
}
