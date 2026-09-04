"use client";

import React, { useState } from "react";
import {
  FiX,
  FiDownload,
  FiLoader,
  FiFilter,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import { useModal } from "@/lib/hooks/useModal";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  productCount?: number;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Products" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "APPROVED", label: "Approved (Live)" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
];

export default function ExportDialog({ open, onClose, productCount }: ExportDialogProps) {
  useModal(open, onClose);
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const reset = () => {
    setFormat("csv");
    setStatus("ALL");
    setCategory("");
    setFrom("");
    setTo("");
    setLowStock(false);
    setOutOfStock(false);
    setExporting(false);
    setError("");
    setDone(false);
  };

  const close = () => {
    if (exporting) return;
    reset();
    onClose();
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch("/api/seller/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          status,
          category: category.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          lowStock,
          outOfStock,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Export failed. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "xlsx"
          ? `seller-products-export-${Date.now()}.xlsx`
          : `seller-products-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
              {done ? (
                <FiCheckCircle size={20} className="text-[#FF6B35]" />
              ) : (
                <FiDownload size={20} className="text-[#FF6B35]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Export Products</p>
              <p className="text-[11px] text-gray-400">Export only your own products</p>
            </div>
          </div>
          <button
            onClick={close}
            disabled={exporting}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Export Format</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setFormat("csv")}
                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  format === "csv"
                    ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#1F1F1F]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setFormat("xlsx")}
                className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  format === "xlsx"
                    ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#1F1F1F]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                XLSX (Excel)
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <FiFilter size={12} /> Filters
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/40"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium mb-1 block">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Clothing"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium mb-1 block">From</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium mb-1 block">To</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 cursor-pointer text-xs font-semibold text-gray-500">
                  <input
                    type="checkbox"
                    checked={lowStock}
                    onChange={(e) => setLowStock(e.target.checked)}
                    className="accent-[#FF6B35]"
                  />
                  Low Stock
                </label>
                <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 cursor-pointer text-xs font-semibold text-gray-500">
                  <input
                    type="checkbox"
                    checked={outOfStock}
                    onChange={(e) => setOutOfStock(e.target.checked)}
                    className="accent-[#FF6B35]"
                  />
                  Out of Stock
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">Estimated products</p>
            <p className="text-sm font-bold text-[#1F1F1F] tabular-nums">
              {typeof productCount === "number" ? productCount.toLocaleString() : "—"}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <FiAlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <FiCheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Export started. Check your downloads folder.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 gap-2.5">
          <button
            onClick={close}
            disabled={exporting}
            className="px-4 py-2.5 border border-gray-200 text-sm font-semibold text-gray-500 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <FiLoader size={16} className="animate-spin" />
            ) : (
              <FiDownload size={16} />
            )}
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
