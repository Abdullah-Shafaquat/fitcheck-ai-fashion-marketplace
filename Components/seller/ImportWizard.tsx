"use client";

import React, { useRef, useState } from "react";
import {
  FiUpload,
  FiX,
  FiDownload,
  FiAlertTriangle,
  FiCheckCircle,
  FiLoader,
  FiChevronLeft,
  FiArrowRight,
  FiFileText,
  FiShield,
} from "react-icons/fi";
import { useModal } from "@/lib/hooks/useModal";

interface PreviewRow {
  rowNo: number;
  errors: string[];
  warnings: string[];
  data: Record<string, unknown> | null;
}

interface ValidateResponse {
  format: string;
  fileName: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  rows: PreviewRow[];
  forbiddenColumnsPresent: boolean;
}

type Step = "upload" | "preview" | "importing" | "result";

const BATCH_SIZE = 100;

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportWizard({ open, onClose, onImported }: ImportWizardProps) {
  useModal(open, onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<ValidateResponse | null>(null);
  const [importError, setImportError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    approvalStatus: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setFileName("");
    setValidating(false);
    setPreview(null);
    setImportError("");
    setProgress({ done: 0, total: 0 });
    setResult(null);
    setImporting(false);
  };

  const close = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const onFileChosen = (f: File | null) => {
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setImportError("Unsupported file type. Please upload a .csv or .xlsx file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setImportError("File too large. Maximum size is 10MB.");
      return;
    }
    setImportError("");
    setFile(f);
    setFileName(f.name);
  };

  const validateFile = async () => {
    if (!file) return;
    setValidating(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/seller/import/validate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Could not validate the file.");
        return;
      }
      setPreview(data);
      setStep("preview");
    } catch {
      setImportError("Could not validate the file. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const confirmImport = async () => {
    if (!preview || preview.valid === 0) return;
    setStep("importing");
    setImporting(true);
    setImportError("");

    const validRows = preview.rows.filter((r) => r.data);
    const total = validRows.length;
    setProgress({ done: 0, total });

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    let approvalStatus = "";

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch("/api/seller/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: batch.map((r) => r.data),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          imported += data.imported || 0;
          skipped += data.skipped || 0;
          failed += data.failed || 0;
          approvalStatus = data.approvalStatus || approvalStatus;
        } else {
          // A batch failed wholesale (e.g. validation re-check) — count all its
          // rows as failed so we don't silently lose them.
          failed += batch.length;
          setImportError((prev) => prev || data.error || "One or more batches failed.");
        }
      } catch {
        failed += batch.length;
        setImportError((prev) => prev || "A batch failed to import.");
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
    }

    setImporting(false);
    setResult({ imported, skipped, failed, approvalStatus: approvalStatus || "PENDING_REVIEW" });
    setStep("result");
    onImported();
  };

  const downloadTemplate = async () => {
    window.location.href = "/api/seller/import/template";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
              {step === "result" ? (
                <FiCheckCircle size={20} className="text-[#FF6B35]" />
              ) : (
                <FiUpload size={20} className="text-[#FF6B35]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Import Products</p>
              <p className="text-[11px] text-gray-400">
                {step === "upload" && "Upload a CSV or XLSX file"}
                {step === "preview" && "Review your data before importing"}
                {step === "importing" && "Importing your products"}
                {step === "result" && "Import complete"}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            disabled={importing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFileChosen(e.dataTransfer.files?.[0] || null);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-[#FF6B35] bg-[#FF6B35]/5"
                    : "border-gray-200 hover:border-[#FF6B35]/50"
                }`}
              >
                <FiUpload
                  size={40}
                  className="mx-auto text-gray-300 mb-3"
                />
                <p className="text-sm font-semibold text-[#1F1F1F]">
                  {file ? file.name : "Drag & drop your file here, or browse"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CSV or XLSX &middot; up to 10MB &middot; max 1000 rows
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => onFileChosen(e.target.files?.[0] || null)}
                />
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-all mx-auto"
              >
                <FiDownload size={14} />
                Download Import Template (CSV)
              </button>

              {importError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <FiAlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{importError}</p>
                </div>
              )}

              <div className="flex gap-2.5 items-start bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <FiShield size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  All products are imported under <span className="font-semibold text-[#1F1F1F]">your seller account</span>.
                  Ownership is assigned automatically by the server and cannot be changed from the file. Products enter
                  the normal marketplace review process.
                </p>
              </div>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <Stat label="Total" value={preview.total} color="text-gray-700" />
                <Stat label="Valid" value={preview.valid} color="text-emerald-600" />
                <Stat label="Invalid" value={preview.invalid} color="text-red-600" />
                <Stat label="Duplicates" value={preview.duplicates} color="text-amber-600" />
                <Stat label="Warnings" value={preview.warnings} color="text-gray-500" />
              </div>

              {preview.forbiddenColumnsPresent && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <FiAlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    The file contains restricted fields (e.g. sellerId, approvalStatus, id). These were ignored —
                    ownership and approval are always assigned by the server.
                  </p>
                </div>
              )}

              {preview.invalid === 0 ? (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <FiCheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">
                    All {preview.valid} rows are valid and ready to import.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2">
                    {preview.invalid} row{preview.invalid !== 1 ? "s" : ""} need correction. Fix your file and re-upload.
                  </p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-bold text-gray-400 uppercase">Row</th>
                            <th className="text-left px-4 py-2 font-bold text-gray-400 uppercase">SKU</th>
                            <th className="text-left px-4 py-2 font-bold text-gray-400 uppercase">Problems</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows
                            .filter((r) => r.errors.length > 0)
                            .map((r) => (
                              <tr key={r.rowNo} className="border-t border-gray-50 align-top">
                                <td className="px-4 py-2.5 font-semibold text-gray-500">Row {r.rowNo}</td>
                                <td className="px-4 py-2.5 text-gray-500">
                                  {String(r.data?.sku || r.data?.name || "—")}
                                </td>
                                <td className="px-4 py-2.5">
                                  <ul className="space-y-1">
                                    {r.errors.map((e, i) => (
                                      <li key={i} className="text-red-500 font-medium">
                                        {e}
                                      </li>
                                    ))}
                                    {r.warnings.length > 0 && (
                                      <li className="text-amber-500">{r.warnings.join("; ")}</li>
                                    )}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="py-10 text-center space-y-4">
              <FiLoader size={36} className="mx-auto text-[#FF6B35] animate-spin" />
              <div>
                <p className="text-sm font-semibold text-[#1F1F1F]">Processing products</p>
                <p className="text-xs text-gray-400 mt-1 text-[#FF6B35] font-bold">
                  {progress.done} / {progress.total}
                </p>
              </div>
              <div className="max-w-sm mx-auto h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B35] transition-all duration-300"
                  style={{
                    width: progress.total
                      ? `${Math.round((progress.done / progress.total) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Each batch is validated and imported on the server. Do not close this window.
              </p>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4">
                <FiCheckCircle size={30} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">Import complete</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {result.imported} imported &middot; {result.skipped} skipped &middot; {result.failed} failed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <Stat label="Imported" value={result.imported} color="text-emerald-600" />
                <Stat label="Skipped" value={result.skipped} color="text-amber-600" />
                <Stat label="Failed" value={result.failed} color="text-red-600" />
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Imported products were created with status{" "}
                  <span className="font-semibold text-[#1F1F1F]">
                    {result.approvalStatus === "APPROVED" ? "Approved (Live)" : "Pending Review"}
                  </span>
                  .{" "}
                  {result.approvalStatus !== "APPROVED" &&
                    "They will become publicly visible once approved by an admin."}
                </p>
              </div>

              {importError && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <FiAlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">{importError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400">
            {step === "preview" && preview && (
              <>
                {preview.valid} of {preview.total} rows ready
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {step === "upload" && (
              <button
                onClick={validateFile}
                disabled={!file || validating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <FiLoader size={16} className="animate-spin" />
                ) : (
                  <FiArrowRight size={16} />
                )}
                {validating ? "Validating..." : "Validate File"}
              </button>
            )}

            {step === "preview" && (
              <>
                <button
                  onClick={() => setStep("upload")}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-sm font-semibold text-gray-500 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <FiChevronLeft size={14} />
                  Back
                </button>
                <button
                  onClick={confirmImport}
                  disabled={!preview || preview.valid === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiCheckCircle size={16} />
                  Confirm Import ({preview?.valid ?? 0})
                </button>
              </>
            )}

            {step === "importing" && (
              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl opacity-60"
              >
                <FiLoader size={16} className="animate-spin" />
                Importing...
              </button>
            )}

            {step === "result" && (
              <button
                onClick={close}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1F1F1F] text-white text-sm font-semibold rounded-xl hover:bg-black transition-all"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}
