"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  FiUpload,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiDownload,
  FiCheckCircle,
  FiArrowLeft,
  FiAlertTriangle,
  FiRefreshCw,
  FiLink,
  FiFilter,
  FiList,
  FiLayers,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useModal } from "@/lib/hooks/useModal";
import { useToast } from "./Toast";
import { showSuccess, showError } from "./Toast";

/* ------------------------------------------------------------------ */
/* Field catalogue for column mapping / preview                        */
/* ------------------------------------------------------------------ */

interface TargetField {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

const TARGET_FIELDS: TargetField[] = [
  { key: "name", label: "Product Name", required: true },
  { key: "price", label: "Price", required: true },
  { key: "category", label: "Category", required: true },
  { key: "gender", label: "Gender", required: true },
  { key: "sku", label: "SKU", required: false },
  { key: "oldPrice", label: "Old Price", required: false },
  { key: "subCategory", label: "Sub-Category", required: false },
  { key: "stock", label: "Stock", required: false },
  { key: "sizes", label: "Sizes", required: false },
  { key: "colors", label: "Colors", required: false },
  { key: "images", label: "Product Images", required: false },
  { key: "colorImages", label: "Color-Wise Images (JSON)", required: false, hint: 'JSON like {"Red":["url1","url2"],"Blue":["url3"]}' },
  { key: "badge", label: "Badge", required: false },
  { key: "featured", label: "Featured", required: false },
  { key: "latestArrival", label: "Latest Arrival", required: false },
  { key: "isActive", label: "Active Status", required: false },
  { key: "description", label: "Description", required: false },
];

const AUTO_MAP: Record<string, string[]> = {
  name: ["product name", "name", "title"],
  price: ["price", "product price"],
  category: ["category"],
  gender: ["gender", "for"],
  sku: ["sku"],
  oldPrice: ["old price", "oldprice"],
  subCategory: ["sub-category", "sub category", "subcategory"],
  stock: ["stock", "quantity"],
  sizes: ["sizes", "size"],
  colors: ["colors", "color"],
  images: ["product images", "images", "image"],
  colorImages: ["color-wise images", "color images", "colorimages", "colorwise"],
  badge: ["badge", "tag"],
  featured: ["featured", "is featured"],
  latestArrival: ["latest arrival", "latest"],
  isActive: ["active status", "status", "active"],
  description: ["description", "desc"],
};

const POSITIONAL_MAP: Record<number, string> = {
  0: "Product ID", 1: "Product Name", 2: "SKU", 3: "Slug",
  4: "Category", 5: "Sub-Category", 6: "Gender", 7: "Price",
  8: "Old Price", 9: "Stock", 10: "Rating", 11: "Reviews Count",
  12: "Badge", 13: "Featured", 14: "Latest Arrival", 15: "Active Status",
  16: "Sizes", 17: "Colors", 18: "Product Images", 19: "Color-Wise Images (JSON)",
  20: "Description", 21: "Created Date", 22: "Updated Date",
};

const TEMPLATE_HEADERS = [
  "Product Name", "Price", "Category", "Gender", "SKU", "Old Price",
  "Sub-Category", "Stock", "Sizes", "Colors", "Product Images",
  "Color-Wise Images (JSON)", "Badge",
  "Featured", "Latest Arrival", "Active Status", "Description",
];

const SAMPLE_ROW = [
  "Classic Oxford Shirt", "2999", "Shirts", "Men", "SHIRT-OXF-001", "",
  "", "50", "S, M, L, XL", "White, Blue",
  "https://example.com/shirt-1.jpg",
  '{"White":["https://example.com/shirt-1.jpg"],"Blue":["https://example.com/shirt-2.jpg"]}',
  "New", "Yes", "Yes", "Active",
  "A premium cotton oxford shirt for all seasons.",
];

/* row -> unified product build rules */
function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function toInt(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}
function toBool(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return ["yes", "true", "1", "y", "active"].includes(s);
}
function parseStringArray(v: unknown): string[] {
  if (v === null || v === undefined || String(v).trim() === "") return [];
  const raw = String(v).trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
      if (parsed && typeof parsed === "object" && Array.isArray(Object.values(parsed)[0])) {
        return Object.values(parsed).flat() as string[];
      }
    } catch { /* fall through to split */ }
  }
  return [];
}

function splitList(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  const parsed = parseStringArray(v);
  if (parsed.length > 0) return parsed;
  return String(v).split(/[,;|\n]/).map((s) => s.replace(/^["'\[]+|["'\]]+$/g, "").trim()).filter(Boolean);
}

function cleanImageUrl(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  if (!s) return "";
  s = s.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) {
    return s.replace(/([^:])\/\//g, "$1/");
  }
  if (s.startsWith("/")) {
    return s.replace(/\/{2,}/g, "/");
  }
  return s;
}

function normalizeImageList(v: unknown): string[] {
  return splitList(v).map(cleanImageUrl).filter(Boolean);
}

function normalizeColorImages(v: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (v === null || v === undefined || String(v).trim() === "") return out;
  try {
    const parsed = JSON.parse(String(v));
    if (parsed && typeof parsed === "object") {
      for (const [color, urls] of Object.entries(parsed)) {
        if (Array.isArray(urls)) {
          const cleaned = urls.map(cleanImageUrl).filter(Boolean);
          if (cleaned.length) out[color.trim()] = cleaned;
        } else if (typeof urls === "string" && urls.trim()) {
          const cleaned = normalizeImageList(urls);
          if (cleaned.length) out[color.trim()] = cleaned;
        }
      }
    }
  } catch { /* ignore invalid JSON */ }
  return out;
}

function buildAutoMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const norm = headers.map((h) => String(h).trim().toLowerCase());
  for (const field of TARGET_FIELDS) {
    const aliases = AUTO_MAP[field.key] || [];
    for (const alias of aliases) {
      const idx = norm.findIndex((h) => h === alias || h.includes(alias));
      if (idx >= 0) { map[field.key] = headers[idx]; break; }
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type Step = "upload" | "map" | "preview" | "import" | "done";

interface RowStatus {
  name: string;
  state: "queued" | "adding" | "done" | "error";
  message?: string;
}

interface ImportExportModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  productCount: number;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  open,
  onClose,
  onRefresh,
  productCount,
}) => {
  const reduce = useReducedMotion();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");

  /* parsing */
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [headerKeys, setHeaderKeys] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  /* mapping */
  const [mapping, setMapping] = useState<Record<string, string>>({}); // fieldKey -> source column

  /* import */
  const [importing, setImporting] = useState(false);
  const [liveRows, setLiveRows] = useState<RowStatus[]>([]);
  const [importCounters, setImportCounters] = useState({ done: 0, ok: 0, err: 0 });
  const [report, setReport] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [isBatch, setIsBatch] = useState(false);
  const [batchPct, setBatchPct] = useState(0);
  const resultListRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (importing) return;
    onClose();
  }, [importing, onClose]);

  /* close via Escape / backdrop; disable while an import is running */
  useModal(open, step === "import" ? undefined : handleClose);

  /* auto-scroll live list as products get added */
  useEffect(() => {
    if (step !== "import") return;
    const el = resultListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [liveRows, step]);

  /* ---------------- helpers ---------------- */

  const downloadBlob = (content: BlobPart, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([TEMPLATE_HEADERS, SAMPLE_ROW]);
    downloadBlob(
      csv,
      `fitcheck_import_template_${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8;"
    );
    toast("info", "Template downloaded — fill it in and re-import.", 3500);
  };

  /* ---------------- parsing ---------------- */

  const processFile = useCallback((file: File) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isExcel = /\.xlsx?$/i.test(file.name);
    setParsing(true);
    setParseError("");
    setFileName(file.name);
    setStep("upload");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        let parsed: Record<string, any>[] = [];
        let headers: string[] = [];

        if (!isCsv && !isExcel) {
          setParseError("Please upload a CSV or Excel (.xlsx/.xls) file.");
          setParsing(false);
          return;
        }

        if (isCsv) {
          const result = Papa.parse(content as string, { header: true, skipEmptyLines: true });
          parsed = result.data as Record<string, any>[];
          headers = Object.keys(parsed[0] || {});
        } else {
          const wb = XLSX.read(content, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

          if (raw.length === 0) {
            setParseError("Excel file is empty.");
            setParsing(false);
            return;
          }

          const firstRow = raw[0];
          const hasRealHeaders = firstRow.some((c: any) => {
            const s = String(c || "").trim();
            return s !== "" && isNaN(Number(s)) && !/^_?\d+$/.test(s);
          });

          if (hasRealHeaders) {
            headers = firstRow.map((h: any, i: number) =>
              h && String(h).trim() !== "" ? String(h).trim() : `_col${i}`
            );
            parsed = raw.slice(1)
              .filter((r) => r.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ""))
              .map((r) => {
                const obj: Record<string, any> = {};
                headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
                return obj;
              });
          } else {
            let dataStart = 0;
            for (let i = 0; i < raw.length; i++) {
              const nonEmpty = raw[i].filter((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
              if (nonEmpty.length >= 5) { dataStart = i; break; }
            }
            // positional: use first data row's column count as header width
            const width = Math.max(raw[dataStart]?.length || 0, 5);
            headers = Array.from({ length: width }, (_, i) =>
              POSITIONAL_MAP[i] || `_col${i}`
            );
            parsed = raw.slice(dataStart)
              .filter((r) => r.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ""))
              .map((r) => {
                const obj: Record<string, any> = {};
                headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
                return obj;
              });
          }
        }

        if (parsed.length === 0) {
          setParseError("File has no data rows. Please check the file.");
          setParsing(false);
          return;
        }

        setHeaderKeys(headers);
        setRawRows(parsed);
        setMapping(buildAutoMapping(headers));
        setParsing(false);
        setStep("map");
      } catch {
        setParseError("Failed to parse file. Check the format.");
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError("Failed to read file.");
      setParsing(false);
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  /* ---------------- mapping -> products ---------------- */

  const mappedProducts = useMemo(() => {
    const extract = (row: Record<string, any>, key: string): any => {
      const col = mapping[key];
      return col ? row[col] : undefined;
    };
    return rawRows.map((row) => {
      const name = String(extract(row, "name") ?? "").trim();
      const errs: string[] = [];
      if (!name) errs.push("Missing product name");
      const price = toNum(extract(row, "price"));
      if (price <= 0) errs.push("Invalid price");

      const colorImagesRaw = extract(row, "colorImages");
      const colorImages = normalizeColorImages(colorImagesRaw);

      const images = normalizeImageList(extract(row, "images"));
      if (images.length === 0 && Object.keys(colorImages).length > 0) {
        const first = Object.values(colorImages).flat().filter(Boolean).map(String);
        if (first.length) images.push(...first);
      }

      return {
        name,
        price,
        oldPrice: (() => {
          const op = toNum(extract(row, "oldPrice"));
          return op > 0 && op > price ? op : null;
        })(),
        category: String(extract(row, "category") ?? "Uncategorized").trim() || "Uncategorized",
        subCategory: (() => { const v = String(extract(row, "subCategory") ?? "").trim(); return v || null; })(),
        gender: String(extract(row, "gender") ?? "Unisex").trim() || "Unisex",
        description: String(extract(row, "description") ?? "").trim(),
        sizes: splitList(extract(row, "sizes")),
        colors: splitList(extract(row, "colors")),
        images: images.length > 0 ? images : ["/images/placeholder.jpg"],
        colorImages,
        stock: toInt(extract(row, "stock")),
        sku: (() => { const v = String(extract(row, "sku") ?? "").trim(); return v || null; })(),
        badge: (() => { const v = String(extract(row, "badge") ?? "").trim(); return v || null; })(),
        featured: toBool(extract(row, "featured")),
        latestArrival: toBool(extract(row, "latestArrival")),
        isActive: (() => {
          const v = String(extract(row, "isActive") ?? "").trim();
          if (v === "") return true;
          return toBool(extract(row, "isActive"));
        })(),
        errors: errs,
      };
    });
  }, [rawRows, mapping]);

  const validCount = mappedProducts.filter((p) => p.errors.length === 0).length;
  const invalidCount = mappedProducts.length - validCount;

  const missingRequired = TARGET_FIELDS.filter(
    (f) => f.required && !mapping[f.key]
  );

  /* ---------------- import (live) ---------------- */

  const runLiveImport = async (rows: typeof mappedProducts) => {
    const statuses: RowStatus[] = rows.map((r) => ({
      name: r.name || "Unnamed product",
      state: r.errors.length ? "error" : "queued",
      message: r.errors.length ? r.errors[0] : undefined,
    }));
    setLiveRows(statuses);
    setIsBatch(false);
    setStep("import");
    setImporting(true);
    setImportCounters({ done: 0, ok: 0, err: 0 });

    let ok = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.errors.length) {
        errors.push(`Row ${i + 1}: ${row.errors[0]}`);
        skipped++;
        setLiveRows((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "error", message: row.errors[0] } : s));
        setImportCounters((c) => ({ done: c.done + 1, ok: c.ok, err: c.err + 1 }));
        continue;
      }

      setLiveRows((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "adding" } : s));

      try {
        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: [{
              name: row.name, price: row.price, oldPrice: row.oldPrice,
              category: row.category, subCategory: row.subCategory, gender: row.gender,
              description: row.description, sizes: row.sizes, colors: row.colors,
              images: row.images, colorImages: row.colorImages, stock: row.stock,
              sku: row.sku, badge: row.badge, featured: row.featured,
              latestArrival: row.latestArrival, isActive: row.isActive,
            }],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.imported !== 1) {
          const why = (data.errors && data.errors[0]) || "Import failed";
          errors.push(`Row ${i + 1}: ${why}`);
          skipped++;
          setLiveRows((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "error", message: why } : s));
          setImportCounters((c) => ({ done: c.done + 1, ok: c.ok, err: c.err + 1 }));
        } else {
          ok++;
          setLiveRows((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "done" } : s));
          setImportCounters((c) => ({ done: c.done + 1, ok: c.ok + 1, err: c.err }));
        }
      } catch (err) {
        const why = err instanceof Error ? err.message : "Network error";
        errors.push(`Row ${i + 1}: ${why}`);
        skipped++;
        setLiveRows((prev) => prev.map((s, idx) => idx === i ? { ...s, state: "error", message: why } : s));
        setImportCounters((c) => ({ done: c.done + 1, ok: c.ok, err: c.err + 1 }));
      }
    }

    setImporting(false);
    setReport({ imported: ok, skipped, errors });
    setStep("done");
    onRefresh();
    if (ok > 0) showSuccess(`Imported ${ok} product${ok !== 1 ? "s" : ""}`);
    if (skipped > 0 && ok > 0) showError(`${skipped} skipped during import`);
  };

  const runBatchImport = async (rows: typeof mappedProducts) => {
    const statuses: RowStatus[] = rows.map((r) => ({
      name: r.name || "Unnamed product",
      state: r.errors.length ? "error" : "queued",
      message: r.errors.length ? r.errors[0] : undefined,
    }));
    setLiveRows(statuses);
    setIsBatch(true);
    setStep("import");
    setImporting(true);
    setBatchPct(0);
    setImportCounters({ done: 0, ok: 0, err: 0 });

    // Animate the list filling while a single batch request runs.
    const progressTimer = setInterval(() => {
      setBatchPct((p) => {
        if (p >= 96) { clearInterval(progressTimer); return p; }
        const next = Math.min(96, p + Math.random() * 7);
        const filled = Math.floor((next / 100) * rows.length);
        setLiveRows((prev) =>
          prev.map((s, idx) =>
            idx < filled ? { ...s, state: "done" } : s
          )
        );
        return next;
      });
    }, 180);

    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: rows }),
      });
      clearInterval(progressTimer);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");

      setBatchPct(100);
      // Reconcile live rows with real results.
      setLiveRows((prev) =>
        prev.map((s) => (s.state === "error" ? s : { ...s, state: "done" }))
      );
      setImportCounters({
        done: rows.length,
        ok: data.imported || 0,
        err: data.skipped || 0,
      });
      setReport({
        imported: data.imported || 0,
        skipped: (data.skipped || 0) + rows.filter((r) => r.errors.length).length,
        errors: data.errors || [],
      });
      onRefresh();
      if (data.imported > 0) showSuccess(`Imported ${data.imported} products`);
      if (data.skipped > 0) showError(`${data.skipped} skipped`);
    } catch (err) {
      clearInterval(progressTimer);
      const msg = err instanceof Error ? err.message : "Import failed";
      setReport({ imported: 0, skipped: rows.length, errors: [msg] });
      showError(msg);
    } finally {
      setImporting(false);
      setStep("done");
    }
  };

  const startImport = () => {
    const invalid = mappedProducts.filter((p) => p.errors.length > 0);
    const rows = mappedProducts;
    if (invalid.length > 0) {
      toast("warning", `${invalid.length} row(s) are invalid and will be skipped.`, 3500);
    }
    // Live per-row for reasonably sized files, batch for very large ones.
    if (rows.length <= 250) runLiveImport(rows);
    else runBatchImport(rows);
  };

  /* ---------------- render ---------------- */

  const progress = isBatch
    ? Math.round((batchPct / 100) * liveRows.length)
    : importCounters.done;

  const renderDot = (state: RowStatus["state"]) => {
    switch (state) {
      case "done": return <FiCheckCircle className="text-emerald-500" size={16} />;
      case "error": return <FiAlertTriangle className="text-red-500" size={16} />;
      case "adding": return <FiLoader size={16} className="animate-spin text-[#FF6B35]" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-200" />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#FF6B35]/[0.06] to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center shadow-md shadow-[#FF6B35]/20">
                  <FiUpload size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1F1F1F] leading-none">
                    Import Products
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {productCount > 0 ? `${productCount} products in catalog` : "No products yet"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={importing}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-40"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 pt-5">
              <div className="flex items-center gap-2">
                {([
                  ["upload", "Upload", FiUpload],
                  ["map", "Map Columns", FiFilter],
                  ["preview", "Preview", FiList],
                  ["import", "Import", FiLayers],
                ] as [Step, string, React.ElementType][]).map(([key, label, Icon], i) => {
                  const activeIdx = ["upload", "map", "preview", "import"].indexOf(step);
                  const current = step === key;
                  const done = i < activeIdx || step === "done";
                  return (
                    <React.Fragment key={key}>
                      <div
                        className={`flex items-center gap-2 ${
                          current ? "text-[#FF6B35]" : done ? "text-emerald-500" : "text-gray-300"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                            current
                              ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25"
                              : done
                                ? "bg-emerald-50 text-emerald-500 border border-emerald-200"
                                : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                        >
                          {done && !current ? <FiCheck size={13} /> : <Icon size={13} />}
                        </div>
                        <span className={`text-xs font-semibold ${current ? "text-[#1F1F1F]" : done ? "text-gray-500" : "text-gray-400"}`}>
                          {label}
                        </span>
                      </div>
                      {i < 3 && (
                        <div className={`h-px flex-1 min-w-4 ${done ? "bg-emerald-300" : "bg-gray-200"}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* ---------- UPLOAD ---------- */}
                  {step === "upload" && (
                    <div>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                          isDragOver
                            ? "border-[#FF6B35] bg-[#FF6B35]/[0.04] scale-[1.01]"
                            : "border-gray-200 hover:border-[#FF6B35]/40 hover:bg-gray-50/60"
                        }`}
                      >
                        <motion.div
                          animate={isDragOver ? { scale: 1.08, rotate: [0, -4, 4, 0] } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#FF6B35]/15 to-[#ff8f66]/10 border border-[#FF6B35]/20 flex items-center justify-center"
                        >
                          <FiUpload size={26} className="text-[#FF6B35]" />
                        </motion.div>
                        <h3 className="mt-5 text-base font-bold text-[#1F1F1F]">
                          {isDragOver ? "Drop your file here" : "Drag & drop your file"}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          or{" "}
                          <button
                            onClick={openFilePicker}
                            className="text-[#FF6B35] font-semibold hover:underline"
                          >
                            browse
                          </button>{" "}
                          — supports <span className="font-medium text-gray-500">.csv, .xlsx, .xls</span>
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {parsing && (
                          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <FiLoader className="animate-spin text-[#FF6B35]" size={18} />
                            Parsing file...
                          </div>
                        )}
                        {parseError && (
                          <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                            <FiAlertTriangle size={15} />
                            {parseError}
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <button
                          onClick={downloadTemplate}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#FF6B35]/40 hover:text-[#FF6B35] hover:bg-[#FF6B35]/[0.03] transition-all active:scale-[0.98] w-full sm:w-auto sm:min-w-[240px]"
                        >
                          <FiDownload size={16} />
                          Download template
                        </button>
                      </div>

                      <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 flex items-start gap-2">
                        <FiAlertCircle className="text-[#FF6B35] mt-0.5 flex-shrink-0" size={14} />
                        <span>
                          Use the <b>template</b> for the exact columns. After uploading, you&apos;ll be able to map
                          columns to product fields and preview everything <b>before</b> it&apos;s saved.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ---------- MAP ---------- */}
                  {step === "map" && (
                    <div>
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[#1F1F1F]">Map columns to fields</h3>
                          <p className="text-xs text-gray-400">
                            <span className="font-medium text-gray-500">{fileName}</span> ·{" "}
                            {headerKeys.length} columns · {rawRows.length} data rows
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={downloadTemplate}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:underline px-2 py-1"
                          >
                            <FiDownload size={13} />
                            Template
                          </button>
                          <button
                            onClick={() => setMapping(buildAutoMapping(headerKeys))}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#FF6B35] bg-[#FF6B35]/5 border border-[#FF6B35]/20 hover:bg-[#FF6B35]/10 transition-all active:scale-95"
                          >
                            <FiRefreshCw size={13} />
                            Auto-map
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-center gap-2 text-xs text-gray-500">
                        <FiLink size={14} className="text-[#FF6B35]" />
                        For each field below, choose which spreadsheet column supplies it.
                        <b className="text-gray-700">Required</b> fields are marked.
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {TARGET_FIELDS.map((field) => {
                          const val = mapping[field.key];
                          const isRequired = field.required;
                          const missing = isRequired && !val;
                          return (
                            <label
                              key={field.key}
                              className={`block rounded-xl border p-3 transition-all duration-200 ${
                                missing
                                  ? "border-red-200 bg-red-50/40"
                                  : val
                                    ? "border-emerald-200 bg-emerald-50/30"
                                    : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-gray-600">
                                  {field.label}
                                  {isRequired && <span className="text-red-400"> *</span>}
                                </span>
                                {missing ? (
                                  <FiAlertTriangle size={13} className="text-red-400" />
                                ) : val ? (
                                  <FiCheck size={13} className="text-emerald-500" />
                                ) : (
                                  <span className="text-[10px] text-gray-400">optional</span>
                                )}
                              </div>
                              <select
                                value={val || ""}
                                onChange={(e) =>
                                  setMapping((m) => ({ ...m, [field.key]: e.target.value }))
                                }
                                className="w-full text-sm bg-transparent outline-none border-b border-gray-200 focus:border-[#FF6B35] pb-1 text-gray-700 cursor-pointer"
                              >
                                <option value="">— Not mapped —</option>
                                {headerKeys.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>

                      {missingRequired.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                          <FiAlertTriangle size={15} />
                          Map these required fields: {missingRequired.map((f) => f.label).join(", ")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------- PREVIEW ---------- */}
                  {step === "preview" && (
                    <div>
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[#1F1F1F]">
                            Preview & validate
                          </h3>
                          <p className="text-xs text-gray-400">
                            Review how your products will be imported
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                            <FiCheck size={13} />
                            {validCount} valid
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                            <FiAlertCircle size={13} />
                            {invalidCount} invalid
                          </span>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">#</th>
                              <th className="px-4 py-2.5 font-semibold">Name</th>
                              <th className="px-4 py-2.5 font-semibold">Price</th>
                              <th className="px-4 py-2.5 font-semibold">Category</th>
                              <th className="px-4 py-2.5 font-semibold">Gender</th>
                              <th className="px-4 py-2.5 font-semibold">Stock</th>
                              <th className="px-4 py-2.5 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {mappedProducts.map((p, i) => {
                              const bad = p.errors.length > 0;
                              return (
                                <tr key={i} className={bad ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
                                  <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                                  <td className={`px-4 py-2.5 font-medium ${bad ? "text-gray-400" : "text-gray-800"}`}>
                                    {p.name || <span className="italic text-gray-300">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600">
                                    {p.price > 0 ? p.price.toLocaleString() : <span className="text-red-400">invalid</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600">{p.category}</td>
                                  <td className="px-4 py-2.5 text-gray-600">{p.gender}</td>
                                  <td className="px-4 py-2.5 text-gray-600">{p.stock}</td>
                                  <td className="px-4 py-2.5">
                                    {bad ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                                        <FiAlertTriangle size={12} />
                                        {p.errors[0]}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                        <FiCheck size={12} />
                                        Ready
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {rawRows.length > 250 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl">
                          <FiAlertTriangle size={14} />
                          Large file ({rawRows.length} rows) — will use fast batch import with a live progress list.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------- IMPORT (LIVE) ---------- */}
                  {step === "import" && (
                    <div>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div>
                          <h3 className="text-base font-bold text-[#1F1F1F]">
                            {isBatch ? "Importing (batch)…" : "Importing products…"}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {isBatch
                              ? "Products are being added — watch the list fill in real time."
                              : "Each product below updates live as it's added to your store."}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#FF6B35] tabular-nums">
                            {progress}<span className="text-gray-300 text-base">/{liveRows.length}</span>
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">
                            {importCounters.ok} added · {importCounters.err} skipped
                          </p>
                        </div>
                      </div>

                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF6B35] to-[#ff8f66] rounded-full transition-all duration-200"
                          style={{ width: `${liveRows.length ? (progress / liveRows.length) * 100 : 0}%` }}
                        />
                      </div>

                      <div
                        ref={resultListRef}
                        className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100"
                      >
                        {liveRows.map((row, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: reduce ? 0 : -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-3 px-4 py-2.5 ${
                              row.state === "error"
                                ? "bg-red-50/40"
                                : row.state === "done"
                                  ? "bg-emerald-50/30"
                                  : "bg-white"
                            }`}
                          >
                            <span className="text-[10px] text-gray-300 font-mono w-6">{i + 1}</span>
                            <span className="flex-shrink-0">{renderDot(row.state)}</span>
                            <span
                              className={`flex-1 text-sm truncate ${
                                row.state === "error"
                                  ? "text-gray-400 line-through"
                                  : row.state === "done"
                                    ? "text-gray-600"
                                    : "text-gray-800"
                              }`}
                            >
                              {row.name}
                            </span>
                            {row.state === "adding" && (
                              <span className="text-[10px] font-semibold text-[#FF6B35] uppercase">
                                Adding…
                              </span>
                            )}
                            {row.state === "done" && (
                              <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                                Added
                              </span>
                            )}
                            {row.state === "error" && row.message && (
                              <span className="text-[10px] text-red-400 truncate max-w-[40%]" title={row.message}>
                                {row.message}
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ---------- DONE / REPORT ---------- */}
                  {step === "done" && report && (
                    <div>
                      <div className="text-center py-4">
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                          className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center"
                        >
                          <FiCheckCircle size={30} className="text-emerald-500" />
                        </motion.div>
                        <h3 className="mt-4 text-lg font-bold text-[#1F1F1F]">
                          Import complete
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {report.imported} added · {report.skipped} skipped · {report.errors.length} issue{report.errors.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center rounded-xl bg-emerald-50 border border-emerald-100 py-4">
                          <p className="text-2xl font-bold text-emerald-600">{report.imported}</p>
                          <p className="text-xs text-gray-400 font-medium mt-0.5">Imported</p>
                        </div>
                        <div className="text-center rounded-xl bg-amber-50 border border-amber-100 py-4">
                          <p className="text-2xl font-bold text-amber-600">{report.skipped}</p>
                          <p className="text-xs text-gray-400 font-medium mt-0.5">Skipped</p>
                        </div>
                        <div className="text-center rounded-xl bg-red-50 border border-red-100 py-4">
                          <p className="text-2xl font-bold text-red-500">{report.errors.length}</p>
                          <p className="text-xs text-gray-400 font-medium mt-0.5">Issues</p>
                        </div>
                      </div>

                      {report.errors.length > 0 && (
                        <div className="rounded-xl border border-red-100 bg-red-50/40 max-h-40 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-red-100 text-xs font-bold uppercase tracking-wide text-red-400">
                            Error report
                          </div>
                          <ul className="divide-y divide-red-100/60">
                            {report.errors.slice(0, 50).map((err, i) => (
                              <li key={i} className="px-4 py-2 text-xs text-red-600 flex items-start gap-2">
                                <FiAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                {err}
                              </li>
                            ))}
                            {report.errors.length > 50 && (
                              <li className="px-4 py-2 text-xs text-gray-400">
                                …and {report.errors.length - 50} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="mt-5 flex justify-end">
                        <button
                          onClick={() => { onClose(); onRefresh(); }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-[0.98] shadow-md shadow-[#FF6B35]/20"
                        >
                          Done
                          <FiArrowLeft size={15} className="rotate-180" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            {(step === "upload" || step === "map" || step === "preview") && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
                <button
                  onClick={() => {
                    if (step === "map") setStep("upload");
                    else if (step === "preview") setStep("map");
                    else onClose();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-all active:scale-[0.98]"
                >
                  <FiChevronLeft size={15} />
                  {step === "upload" ? "Cancel" : "Back"}
                </button>

                {step === "upload" && (
                  <button
                    onClick={openFilePicker}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-[0.98] shadow-md shadow-[#FF6B35]/20"
                  >
                    <FiUpload size={16} />
                    Choose file
                  </button>
                )}

                {step === "map" && (
                  <button
                    onClick={() => setStep("preview")}
                    disabled={missingRequired.length > 0 || rawRows.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-[0.98] shadow-md shadow-[#FF6B35]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next: Preview
                    <FiChevronRight size={16} />
                  </button>
                )}

                {step === "preview" && (
                  <button
                    onClick={startImport}
                    disabled={validCount === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-[0.98] shadow-md shadow-[#FF6B35]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Import {validCount > 0 ? `${validCount} product${validCount !== 1 ? "s" : ""}` : ""}
                    <FiChevronRight size={16} />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportExportModal;
