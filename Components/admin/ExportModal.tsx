"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  FiDownload,
  FiX,
  FiFileText,
  FiGrid,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useModal } from "@/lib/hooks/useModal";
import { useToast } from "./Toast";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: () => Array<Record<string, unknown>>;
  productCount: number;
  selectedCount?: number;
}

const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  onExport,
  productCount,
  selectedCount = 0,
}) => {
  const reduce = useReducedMotion();
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "csv" | "xlsx">(null);

  useModal(open, onClose);

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

  const handleExportCSV = () => {
    try {
      setBusy("csv");
      const data = onExport();
      if (data.length === 0) {
        toast("warning", "No products to export", 3000);
        return;
      }
      downloadBlob(
        Papa.unparse(data),
        `fitcheck_products_${new Date().toISOString().split("T")[0]}.csv`,
        "text/csv;charset=utf-8;"
      );
      toast("success", `Exported ${data.length} products to CSV`, 3000);
    } catch {
      toast("error", "Failed to export", 3000);
    } finally {
      setBusy(null);
    }
  };

  const handleExportExcel = () => {
    try {
      setBusy("xlsx");
      const data = onExport();
      if (data.length === 0) {
        toast("warning", "No products to export", 3000);
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fitcheck_products_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("success", `Exported ${data.length} products to Excel`, 3000);
    } catch {
      toast("error", "Failed to export", 3000);
    } finally {
      setBusy(null);
    }
  };

  const exportCount = selectedCount > 0 ? selectedCount : productCount;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-[#1F1F1F]/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 12 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            className="relative w-full max-w-md flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-500/[0.08] to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
                  <FiDownload size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1F1F1F] leading-none">
                    Export Products
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {exportCount > 0
                      ? `${exportCount} product${exportCount === 1 ? "" : "s"} ready to export`
                      : "No products available"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 flex items-start gap-2">
                <FiAlertCircle className="text-teal-500 mt-0.5 flex-shrink-0" size={14} />
                <span>
                  Choose a format below. Exported files include{" "}
                  <b>all product fields</b>, product images, and{" "}
                  <b>color-wise images (JSON)</b>.
                </span>
              </div>

              <button
                onClick={handleExportCSV}
                disabled={busy !== null || exportCount === 0}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl border border-gray-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  {busy === "csv" ? (
                    <FiLoader size={20} className="text-teal-600 animate-spin" />
                  ) : (
                    <FiFileText className="text-teal-600" size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-700 text-sm">CSV File</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Comma-separated values — opens in Excel / Google Sheets
                  </p>
                </div>
                <FiCheckCircle className="text-teal-500 text-lg flex-shrink-0" size={18} />
              </button>

              <button
                onClick={handleExportExcel}
                disabled={busy !== null || exportCount === 0}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {busy === "xlsx" ? (
                    <FiLoader size={20} className="text-blue-600 animate-spin" />
                  ) : (
                    <FiGrid className="text-blue-600" size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-700 text-sm">Excel File</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Microsoft Excel (.xlsx) workbook
                  </p>
                </div>
                <FiCheckCircle className="text-blue-500 text-lg flex-shrink-0" size={18} />
              </button>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{productCount} total products</span>
                {selectedCount > 0 && (
                  <span className="font-semibold text-[#FF6B35]">
                    {selectedCount} selected
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;
