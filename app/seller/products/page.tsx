"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSend,
  FiEye,
  FiPackage,
  FiDownload,
  FiUpload,
  FiAlertCircle,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";
import ImportWizard from "@/Components/seller/ImportWizard";
import ExportDialog from "@/Components/seller/ExportDialog";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  approvalStatus: string;
  isActive: boolean;
  images: string[];
  updatedAt: string;
  rejectionReason?: string;
}

const FILTER_TABS = ["All", "Active", "Draft", "Pending", "Rejected"];

const statusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-600";
    case "PENDING_REVIEW":
      return "bg-amber-50 text-amber-600";
    case "REJECTED":
      return "bg-red-50 text-red-600";
    case "DRAFT":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-500";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "Live";
    case "PENDING_REVIEW":
      return "In Review";
    case "REJECTED":
      return "Rejected";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
};

const filterMap: Record<string, string> = {
  All: "",
  Active: "active",
  Draft: "draft",
  Pending: "pending",
  Rejected: "rejected",
};

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (filterVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const f = filterMap[filterVal];
      if (f) params.set("filter", f);
      const res = await fetch(
        `/api/seller/products${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else {
        setError("Failed to load your products. Please try again.");
      }
    } catch {
      setError("Failed to load your products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProducts(filter);
  }, [filter, fetchProducts]);

  const handleSubmitForReview = async (id: string) => {
    setSubmittingId(id);
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (res.ok) {
        fetchProducts(filter);
      }
    } catch {
      // ignore
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/seller/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProducts(filter);
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                  filter === tab
                    ? "bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20"
                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-[#FF6B35]/40 hover:text-[#FF6B35] transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              <FiUpload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-[#FF6B35]/40 hover:text-[#FF6B35] transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              <FiDownload size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Link
              href="/seller/products/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              <FiPlus size={16} />
              <span className="hidden sm:inline">New Product</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <FiPackage size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-500">
              No products found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filter !== "All"
                ? "Try a different filter"
                : "Create your first product to get started"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            {p.images && p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src="/images/placeholder.jpg"
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1F1F1F] truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                        Rs {p.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 tabular-nums text-gray-600">
                        {p.stock}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${statusBadge(p.approvalStatus)}`}
                        >
                          {statusLabel(p.approvalStatus)}
                        </span>
                        {p.approvalStatus === "REJECTED" &&
                          p.rejectionReason && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate">
                              {p.rejectionReason}
                            </p>
                          )}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {(p.approvalStatus === "DRAFT" ||
                            p.approvalStatus === "REJECTED") && (
                            <button
                              onClick={() => handleSubmitForReview(p.id)}
                              disabled={submittingId === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#FF6B35] bg-[#FF6B35]/5 rounded-lg hover:bg-[#FF6B35]/10 transition-all disabled:opacity-50"
                              title="Submit for Review"
                            >
                              {submittingId === p.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FiSend size={12} />
                              )}
                              <span className="hidden sm:inline">Submit</span>
                            </button>
                          )}
                          <Link
                            href={`/seller/products/${p.id}`}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === p.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FiTrash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImported={() => fetchProducts(filter)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} productCount={products.length} />
    </PageTransition>
  );
}
