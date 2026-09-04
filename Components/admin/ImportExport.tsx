"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  FiDownload,
  FiUpload,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiChevronDown,
  FiLoader,
  FiFileText,
  FiGrid,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useToast } from "./Toast";

interface ImportExportProps {
  onImport: (data: any[]) => Promise<void>;
  onExport: () => any[];
  productCount?: number;
  selectedCount?: number;
}

const ImportExport: React.FC<ImportExportProps> = ({
  onImport,
  onExport,
  productCount = 0,
  selectedCount = 0,
}) => {
  const { warning, error: toastError } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasProducts = productCount > 0;
  const hasSelected = selectedCount > 0;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
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
      setIsExporting(true);
      setShowExportDropdown(false);
      const data = onExport();
      if (data.length === 0) {
        warning("No products to export");
        return;
      }
      const csv = Papa.unparse(data);
      downloadFile(
        csv,
        `fitcheck_products_${new Date().toISOString().split("T")[0]}.csv`,
        "text/csv;charset=utf-8;"
      );
    } catch {
      toastError("Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      setShowExportDropdown(false);
      const data = onExport();
      if (data.length === 0) {
        warning("No products to export");
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fitcheck_products_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toastError("Failed to export");
    } finally {
      setIsExporting(false);
    }
  };

  const processFile = useCallback(
    (file: File) => {
      setParsing(true);
      setImportStatus("idle");
      setImportMessage("");
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          let parsed: any[] = [];

          if (file.name.endsWith(".csv")) {
            const result = Papa.parse(content as string, {
              header: true,
              skipEmptyLines: true,
            });
            parsed = result.data;
          } else if (
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls")
          ) {
            const wb = XLSX.read(content, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];

            // Always read as raw rows first, then detect headers
            const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

            if (raw.length === 0) {
              setParsing(false);
              setImportStatus("error");
              setImportMessage("Excel file is empty");
              return;
            }

            // Check if first row has real text headers (not numbers/empty)
            const firstRow = raw[0];
            const hasRealHeaders = firstRow.some((c: any) => {
              const s = String(c || "").trim();
              return s !== "" && isNaN(Number(s)) && !/^_?\d+$/.test(s);
            });

            if (hasRealHeaders) {
              // Normal: first row is headers
              parsed = raw.slice(1)
                .filter((row: any[]) => row.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ""))
                .map((row: any[]) => {
                  const obj: Record<string, any> = {};
                  firstRow.forEach((header: any, idx: number) => {
                    const key = header && String(header).trim() !== "" ? String(header).trim() : `_col${idx}`;
                    obj[key] = row[idx] ?? "";
                  });
                  return obj;
                });
            } else {
              // Headers are broken/missing — use positional mapping
              const KNOWN_HEADERS = [
                "Product ID", "Product Name", "SKU", "Slug", "Category", "Sub-Category",
                "Gender", "Price", "Old Price", "Stock", "Rating", "Reviews Count",
                "Badge", "Featured", "Latest Arrival", "Active Status", "Sizes",
                "Colors", "Product Images", "Color-Wise Images (JSON)", "Description",
                "Created Date", "Updated Date",
              ];

              // Find first row with data (skip empty rows)
              let dataStartIndex = 0;
              for (let i = 0; i < raw.length; i++) {
                const nonEmpty = raw[i].filter((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
                if (nonEmpty.length >= 5) {
                  dataStartIndex = i;
                  break;
                }
              }

              parsed = raw.slice(dataStartIndex)
                .filter((row: any[]) => row.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ""))
                .map((row: any[]) => {
                  const obj: Record<string, any> = {};
                  row.forEach((cell: any, idx: number) => {
                    const name = idx < KNOWN_HEADERS.length ? KNOWN_HEADERS[idx] : `_col${idx}`;
                    obj[name] = cell ?? "";
                  });
                  return obj;
                });
            }
          } else {
            setParsing(false);
            setImportStatus("error");
            setImportMessage("Please upload a CSV or Excel file");
            return;
          }

          if (parsed.length === 0) {
            setParsing(false);
            setImportStatus("error");
            setImportMessage("File is empty or has invalid format");
            return;
          }

          setParsing(false);
          setIsImporting(true);
          setImportProgress(0);

          const progressInterval = setInterval(() => {
            setImportProgress((prev) => Math.min(prev + Math.random() * 15, 90));
          }, 300);

          try {
            await onImport(parsed);
            setImportProgress(100);
            setImportStatus("success");
            setImportMessage(`${parsed.length} products imported from ${file.name}`);
          } catch (error) {
            setImportStatus("error");
            setImportMessage(
              error instanceof Error ? error.message : "Import failed"
            );
          } finally {
            clearInterval(progressInterval);
            setIsImporting(false);
            setSelectedFile(null);
            setFileKey((k) => k + 1);
            setTimeout(() => setImportProgress(0), 2000);
          }
        } catch {
          setParsing(false);
          setImportStatus("error");
          setImportMessage("Failed to parse file. Check format.");
        }
      };

      reader.onerror = () => {
        setParsing(false);
        setImportStatus("error");
        setImportMessage("Failed to read file");
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    },
    [onImport]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearStatus = () => {
    setImportStatus("idle");
    setImportMessage("");
  };

  React.useEffect(() => {
    if (importStatus === "success" || importStatus === "error") {
      const t = setTimeout(clearStatus, 5000);
      return () => clearTimeout(t);
    }
  }, [importStatus]);

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        key={fileKey}
        ref={fileInputRef}
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Export Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowExportDropdown(!showExportDropdown)}
          disabled={isExporting || !hasProducts}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold active:scale-95"
        >
          {isExporting ? (
            <FiLoader size={16} className="animate-spin" />
          ) : (
            <FiDownload size={16} />
          )}
          <span className="hidden sm:inline">
            {hasSelected ? `Export (${selectedCount})` : "Export"}
          </span>
          <FiChevronDown
            size={14}
            className={`transition-transform duration-200 ${showExportDropdown ? "rotate-180" : ""}`}
          />
        </button>
        {showExportDropdown && hasProducts && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowExportDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2" style={{ zIndex: 9999 }}>
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Export Format
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <FiFileText className="text-teal-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-700">CSV File</p>
                  <p className="text-xs text-gray-400">
                    Comma-separated values
                  </p>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition text-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FiGrid className="text-blue-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-700">Excel File</p>
                  <p className="text-xs text-gray-400">
                    Microsoft Excel (.xlsx)
                  </p>
                </div>
              </button>
              <div className="border-t border-gray-100 mt-1 pt-2 px-4 pb-1">
                <p className="text-xs text-gray-400">
                  {hasSelected
                    ? `${selectedCount} of ${productCount} products selected`
                    : `${productCount} total products`}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Button — uses button onClick, not label */}
      <button
        onClick={handleImportClick}
        disabled={parsing}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 ${
          isDragOver
            ? "bg-[#FF6B35] text-white border-2 border-[#FF6B35] scale-105 shadow-lg shadow-[#FF6B35]/20"
            : "bg-[#FF6B35]/5 text-[#FF6B35] border border-[#FF6B35]/20 hover:bg-[#FF6B35]/10 hover:border-[#FF6B35]/30"
        }`}
      >
        {parsing ? (
          <FiLoader size={16} className="animate-spin" />
        ) : (
          <FiUpload size={16} />
        )}
        <span className="hidden sm:inline">
          {parsing
            ? "Parsing..."
            : isDragOver
              ? "Drop here"
              : "Import"}
        </span>
      </button>

      {/* Import Progress Bar */}
      {isImporting && importProgress > 0 && importProgress < 100 && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF6B35] rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums">
            {Math.round(importProgress)}%
          </span>
        </div>
      )}

      {/* Status Toasts */}
      {importStatus === "success" && (
        <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <FiCheck size={12} className="text-white" />
          </div>
          <span className="font-medium">{importMessage}</span>
          <button
            onClick={clearStatus}
            className="ml-2 p-0.5 rounded-full hover:bg-emerald-100 transition"
          >
            <FiX size={14} />
          </button>
        </div>
      )}
      {importStatus === "error" && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <FiAlertCircle size={16} className="flex-shrink-0" />
          <span className="font-medium max-w-xs">{importMessage}</span>
          <button
            onClick={clearStatus}
            className="ml-2 p-0.5 rounded-full hover:bg-red-100 transition"
          >
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
