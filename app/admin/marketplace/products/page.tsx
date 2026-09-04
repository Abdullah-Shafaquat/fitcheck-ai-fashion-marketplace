"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiPackage,
  FiCheck,
  FiX,
  FiClock,
  FiExternalLink,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface ProductSeller {
  storeName: string;
  storeSlug: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  approvalStatus: string;
  rejectionReason: string | null;
  rejectionReview: {
    reviewer: string;
    reviewedAt: string;
    reason: string;
  } | null;
  images: string[];
  createdAt: string;
  seller: ProductSeller;
}

const STATUS_TABS = ["PENDING_REVIEW", "APPROVED", "REJECTED", "DRAFT"];

const statusBadge: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  DRAFT: "bg-gray-100 text-gray-500",
};

export default function MarketplaceProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ productId: string; reason: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const res = await fetch(`/api/admin/marketplace/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      if (data.pagination) setPagination(data.pagination);
      if (!res.ok) setFetchError(data.error || "Failed to load products");
    } catch {
      setFetchError("Network error — could not load products");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const act = async (productId: string, status: string, reason?: string) => {
    setBusyId(productId);
    try {
      const body: Record<string, string> = { status };
      if (reason) body.reason = reason;
      const res = await fetch(`/api/admin/marketplace/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) fetchProducts();
    } finally {
      setBusyId(null);
    }
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
            <FiPackage size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F1F1F]">Product Approvals</h1>
            <p className="text-xs text-gray-400">Review seller product submissions</p>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab
                  ? "bg-[#FF6B35] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 text-red-500 text-sm">{fetchError}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Product", "Price", "Category", "Stock", "Seller", "Status", "Reviewed", "Created", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiPackage size={14} className="text-gray-300" />
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-[#1F1F1F] truncate max-w-[200px]">{product.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-[#1F1F1F]">Rs {product.price.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{product.category}</td>
                        <td className="px-5 py-3.5 text-gray-600">{product.stock}</td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/admin/marketplace/sellers/${product.seller.storeSlug}`}
                            className="text-[#FF6B35] text-xs font-semibold hover:underline flex items-center gap-1"
                          >
                            {product.seller.storeName}
                            <FiExternalLink size={10} />
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge[product.approvalStatus] || "bg-gray-100 text-gray-500"}`}>
                            {product.approvalStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {product.rejectionReview ? (
                            <div className="text-[11px] leading-tight">
                              <p className="text-gray-600 font-medium">by {product.rejectionReview.reviewer}</p>
                              <p className="text-gray-400">{fmtDate(product.rejectionReview.reviewedAt)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">&mdash;</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(product.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          {product.approvalStatus === "PENDING_REVIEW" && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => act(product.id, "APPROVED")}
                                disabled={busyId === product.id}
                                title="Approve"
                                className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <FiCheck size={15} />
                              </button>
                              <button
                                onClick={() => setRejectModal({ productId: product.id, reason: "" })}
                                disabled={busyId === product.id}
                                title="Reject"
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <FiX size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {products.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No products found</div>
              )}
              {!loading && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 font-semibold">
                    Page {pagination.page} of {pagination.totalPages} · {pagination.total} products
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Reject Product</h3>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Provide a reason for rejecting this product.</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  act(rejectModal.productId, "REJECTED", rejectModal.reason);
                  setRejectModal(null);
                }}
                disabled={busyId === rejectModal.productId}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {busyId === rejectModal.productId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
