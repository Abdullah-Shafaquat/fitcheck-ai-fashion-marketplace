import { parse } from "papaparse";
import * as XLSX from "xlsx";

/**
 * Shared helpers for the seller product import/export system.
 *
 * SECURITY NOTES (all enforced server-side):
 * - Uploaded spreadsheets are treated as untrusted input. Only whitelisted,
 *   safe product columns are ever read. Ownership columns (sellerId / id /
 *   productOwnerType / approvalStatus / rating / reviews / rejectionReason)
 *   are NEVER imported from the file — they are always derived from the
 *   authenticated server-side session.
 * - Export always escapes spreadsheet formula characters so an opened file
 *   cannot execute formulas (CSV / XLSX formula injection).
 */

/** Canonical import columns. key = internal field, label = spreadsheet header. */
export const IMPORT_COLUMNS: {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "array" | "json";
  required: boolean;
  desc: string;
}[] = [
  { key: "name", label: "Name", type: "string", required: true, desc: "Product name" },
  { key: "slug", label: "Slug", type: "string", required: false, desc: "URL slug (auto-generated if blank)" },
  { key: "description", label: "Description", type: "string", required: false, desc: "Product description" },
  { key: "price", label: "Price", type: "number", required: true, desc: "Selling price (PKR, > 0)" },
  { key: "oldPrice", label: "Old Price", type: "number", required: false, desc: "Compare-at price (PKR)" },
  { key: "category", label: "Category", type: "string", required: true, desc: "e.g. Clothing" },
  { key: "subCategory", label: "Sub Category", type: "string", required: false, desc: "e.g. Hoodies" },
  { key: "gender", label: "Gender", type: "string", required: true, desc: "Men / Women / Unisex / Kids" },
  { key: "sizes", label: "Sizes", type: "array", required: false, desc: "Comma-separated sizes" },
  { key: "colors", label: "Colors", type: "array", required: false, desc: "Comma-separated colors" },
  { key: "images", label: "Images", type: "array", required: false, desc: "Comma-separated image URLs" },
  { key: "colorImages", label: "Color Images", type: "json", required: false, desc: 'JSON map { "Black": "url" }' },
  { key: "stock", label: "Stock", type: "number", required: false, desc: "Quantity (>= 0)" },
  { key: "sku", label: "SKU", type: "string", required: false, desc: "Unique SKU" },
  { key: "badge", label: "Badge", type: "string", required: false, desc: "Optional badge text" },
  { key: "featured", label: "Featured", type: "boolean", required: false, desc: "true/false" },
  { key: "latestArrival", label: "Latest Arrival", type: "boolean", required: false, desc: "true/false" },
  { key: "isActive", label: "Active", type: "boolean", required: false, desc: "true/false" },
  { key: "lowStockThreshold", label: "Low Stock Threshold", type: "number", required: false, desc: "Default 5" },
];

/** Column keys a seller is NEVER allowed to influence via the file. */
export const FORBIDDEN_IMPORT_COLUMNS = new Set([
  "sellerId",
  "id",
  "productId",
  "productOwnerType",
  "approvalStatus",
  "rejectionReason",
  "rating",
  "reviews",
  "createdAt",
  "updatedAt",
  "inventory",
]);

/** Map of accepted header variants -> canonical key. Case/space/punct-insensitive. */
function canonicalHeaderKey(header: string): string | null {
  const norm = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!norm) return null;
  for (const col of IMPORT_COLUMNS) {
    const ck = col.key.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const cl = col.label.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (norm === ck || norm === cl) return col.key;
  }
  // Aliases
  const aliases: Record<string, string> = {
    sku: "sku",
    oldprice: "oldPrice",
    subcategory: "subCategory",
    colorimages: "colorImages",
    latestarrival: "latestArrival",
    lowstockthreshold: "lowStockThreshold",
  };
  return aliases[norm] ?? null;
}

function cellToArray(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  const s = String(v).trim();
  if (!s) return [];
  return s
    .split(/[,;|\n]/)
    .map((x) => x.replace(/^["'\[]+|["'\]]+$/g, "").trim())
    .filter(Boolean);
}

function cellToBool(v: unknown): boolean | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

function cellToNumber(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Convert a raw spreadsheet row (keyed by canonical key) into a typed object. */
export function coerceImportRow(raw: Record<string, unknown>): {
  value: Record<string, unknown>;
  warnings: string[];
} {
  const value: Record<string, unknown> = {};
  const warnings: string[] = [];
  for (const col of IMPORT_COLUMNS) {
    const cell = raw[col.key];
    let out: unknown;
    switch (col.type) {
      case "string": {
        const s = cell === null || cell === undefined ? "" : String(cell).trim();
        out = s;
        break;
      }
      case "number":
        out = cellToNumber(cell);
        break;
      case "boolean":
        out = cellToBool(cell);
        break;
      case "array":
        out = cellToArray(cell);
        break;
      case "json": {
        if (cell === null || cell === undefined || String(cell).trim() === "") {
          out = {};
          break;
        }
        try {
          const parsed = JSON.parse(String(cell));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            out = Object.fromEntries(
              Object.entries(parsed as Record<string, unknown>).map(([k, url]) => [
                k.trim(),
                cellToArray(url)[0] || String(url),
              ])
            );
          } else {
            out = {};
          }
        } catch {
          out = {};
          warnings.push(`Color Images ignored (invalid JSON)`);
        }
        break;
      }
    }
    value[col.key] = out;
  }
  return { value, warnings };
}

/** Strip any forbidden/ownership columns from a raw row. Never returns them. */
export function sanitizeImportRow(raw: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const ck = canonicalHeaderKey(k);
    if (ck && !FORBIDDEN_IMPORT_COLUMNS.has(ck)) clean[ck] = v;
  }
  return clean;
}

/**
 * Parse an uploaded buffer into an array of canonical-keyed rows. Returns
 * { rows, headers } or throws a row-agnostic parse error message. Never throws
 * a DB/internal error.
 */
export function parseSpreadsheet(
  buffer: Buffer,
  filename: string
): { rows: Record<string, unknown>[]; headers: string[] } {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "csv") {
    const text = buffer.toString("utf8");
    // Reject NUL bytes / non-text garbage.
    if (text.includes("\u0000")) throw new Error("File is not a valid text CSV.");
    const parsed = parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => String(h).trim(),
    });
    if (parsed.errors && parsed.errors.length > 0) {
      const first = parsed.errors[0];
      throw new Error(
        `Malformed CSV${first.row !== undefined ? ` at row ${first.row + 2}` : ""}: ${first.message}`
      );
    }
    const headers = parsed.meta.fields || [];
    const rows = (parsed.data || []).filter((r) => Object.keys(r).length > 0);
    return { rows: rows.map((r) => sanitizeImportRow(r)), headers };
  }
  if (ext === "xlsx" || ext === "xls") {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: "buffer", cellFormula: false, cellHTML: false });
    } catch {
      throw new Error("File is not a valid XLSX/XLS workbook.");
    }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error("Workbook has no sheets.");
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });
    const headers = (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })[0] || []) as string[];
    const rows = json.map((r) => {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        const ck = canonicalHeaderKey(k);
        if (ck && !FORBIDDEN_IMPORT_COLUMNS.has(ck)) sanitized[ck] = v;
      }
      return sanitized;
    });
    return {
      rows: rows.filter((r) => Object.values(r).some((v) => String(v).trim() !== "")),
      headers: headers.map((h) => String(h).trim()),
    };
  }
  throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
}
