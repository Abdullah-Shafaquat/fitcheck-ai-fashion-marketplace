"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiGrid,
  FiMail,
  FiPhone,
  FiEye,
  FiExternalLink,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Seller {
  id: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  email: string;
  phone: string;
  approvalStatus: string;
  productCount: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalPaidOut: number;
  createdAt: string;
  approvedAt: string | null;
  logo: string | null;
}

const STATUS_TABS = ["All", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED", "BLOCKED", "INACTIVE"];

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-blue-50 text-blue-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  SUSPENDED: "bg-gray-100 text-gray-500",
  BLOCKED: "bg-red-100 text-red-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default function MarketplaceSellersPage() {
  const router = useRouter();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "25");
      const res = await fetch(`/api/admin/marketplace/sellers?${params.toString()}`);
      const data = await res.json();
      setSellers(data.sellers || []);
      if (data.pagination) setPagination(data.pagination);
      if (!res.ok) setFetchError(data.error || "Failed to load sellers");
    } catch {
      setFetchError("Network error — could not load sellers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center">
            <FiGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F1F1F]">Sellers</h1>
            <p className="text-xs text-gray-400">Manage marketplace sellers</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex-1 min-w-[240px] focus-within:border-[#FF6B35]/30 focus-within:ring-1 focus-within:ring-[#FF6B35]/10 transition-all">
            <FiSearch className="text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by store name, owner, email..."
              className="flex-1 outline-none text-sm text-[#1F1F1F]"
            />
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
              {tab.replace("_", " ")}
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
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Store", "Owner", "Email", "Phone", "Status", "Products", "Balance", "Date"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((seller) => {
                      const badge = statusBadge[seller.approvalStatus] || "bg-gray-100 text-gray-500";
                      return (
                        <tr
                          key={seller.id}
                          onClick={() => router.push(`/admin/marketplace/sellers/${seller.id}`)}
                          className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {seller.logo ? (
                                  <img src={seller.logo} alt={seller.storeName} className="w-full h-full object-cover" />
                                ) : (
                                  <FiGrid size={16} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-[#1F1F1F] truncate">{seller.storeName}</p>
                                  {seller.storeSlug && (
                                    <Link
                                      href={`/store/${seller.storeSlug}`}
                                      target="_blank"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-[#FF6B35] transition-colors flex-shrink-0"
                                      title="View storefront"
                                    >
                                      <FiExternalLink size={14} />
                                    </Link>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-400">/{seller.storeSlug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">{seller.ownerName}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{seller.email}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{seller.phone || "—"}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${badge}`}>
                              {seller.approvalStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">{seller.productCount}</td>
                          <td className="px-5 py-3.5">
                            <div className="text-xs">
                              <p className="font-bold text-[#1F1F1F]">Rs {seller.availableBalance.toLocaleString()}</p>
                              {seller.pendingBalance > 0 && (
                                <p className="text-gray-400">+ Rs {seller.pendingBalance.toLocaleString()} pending</p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(seller.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sellers.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No sellers found</div>
              )}
              {!loading && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 font-semibold">
                    Page {pagination.page} of {pagination.totalPages} · {pagination.total} sellers
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
    </PageTransition>
  );
}
