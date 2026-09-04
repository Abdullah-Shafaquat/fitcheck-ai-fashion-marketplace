"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiSearch,
  FiMail,
  FiShoppingBag,
  FiUser,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiShieldOff,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Customer {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  provider: string | null;
  accountStatus: string;
  orders: number;
  totalSpent: number;
  joinDate: string;
  lastOrder: string | null;
  lastLoginAt: string | null;
  isBlockedEmail: boolean;
  hasAccount: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  blockedCount: number;
  totalRevenue: number;
  avgOrderValue: number;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-600",
  INACTIVE: "bg-amber-50 text-amber-600",
  SUSPENDED: "bg-orange-50 text-orange-600",
  BLOCKED: "bg-red-50 text-red-600",
  DELETED: "bg-gray-100 text-gray-500",
  GUEST: "bg-blue-50 text-blue-600",
};

const STATUS_FILTERS = ["All", "Active", "Inactive", "Suspended", "Blocked", "Guest", "Deleted"];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, activeCustomers: 0, blockedCount: 0, totalRevenue: 0, avgOrderValue: 0 });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "25");
      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 });
      if (data.stats) setStats(data.stats);
      if (!res.ok) setFetchError(data.error || "Failed to load customers");
    } catch {
      setFetchError("Network error — could not load customers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.totalPages) return;
    setPage(p);
  };

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { label: "Total Customers", value: String(stats.totalCustomers), icon: FiUser, gradient: "bg-blue-500", sub: "accounts + guests" },
            { label: "Active", value: String(stats.activeCustomers), icon: FiUser, gradient: "bg-emerald-500", sub: "active accounts" },
            { label: "Blocked", value: String(stats.blockedCount), icon: FiShieldOff, gradient: "bg-red-500", sub: "blocked emails" },
            { label: "Total Revenue", value: `Rs ${stats.totalRevenue.toLocaleString()}`, icon: FiShoppingBag, gradient: "bg-purple-500", sub: "all orders" },
            { label: "Avg. Order Value", value: `Rs ${stats.avgOrderValue.toLocaleString()}`, icon: FiDollarSign, gradient: "bg-[#FF6B35]", sub: "per order" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${s.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{s.label}</p>
                    <p className="text-base font-black text-[#1F1F1F] tabular-nums truncate">{s.value}</p>
                    <p className="text-[10px] text-gray-300">{s.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex-1 min-w-[240px] focus-within:border-[#FF6B35]/30 focus-within:ring-1 focus-within:ring-[#FF6B35]/10 transition-all">
            <FiSearch className="text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email or phone..."
              className="flex-1 outline-none text-sm text-[#1F1F1F]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-[#1F1F1F] font-medium focus:border-[#FF6B35]/30 focus:ring-1 focus:ring-[#FF6B35]/10 outline-none transition-all"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Customers Table */}
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
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Customer", "Phone", "Orders", "Total Spent", "Joined", "Last Order", "Status", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => {
                      const initials = customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      const st = customer.isBlockedEmail ? "BLOCKED" : customer.accountStatus;
                      return (
                        <tr
                          key={customer.id}
                          className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Link href={`/admin/customers/${encodeURIComponent(customer.id)}`} className="flex items-center gap-3 group">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                {customer.image ? (
                                  <img src={customer.image} alt={customer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[#1F1F1F] group-hover:text-[#FF6B35] transition-colors truncate">{customer.name}</p>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
                                  <FiMail size={9} /> {customer.email}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{customer.phone || "—"}</td>
                          <td className="px-5 py-3.5 text-gray-600">{customer.orders}</td>
                          <td className="px-5 py-3.5 font-bold text-[#1F1F1F]">Rs {customer.totalSpent.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(customer.joinDate)}</td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(customer.lastOrder)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusStyles[st] || "bg-gray-100 text-gray-500"}`}>
                              {customer.isBlockedEmail ? "Blocked" : st.toLowerCase()}
                              {customer.isBlockedEmail && !customer.hasAccount ? " (email)" : ""}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                                title="View details"
                                className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-colors"
                              >
                                <FiEye size={15} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {customers.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No customers found</div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    Page {pagination.page} of {pagination.totalPages} · {pagination.total} customers
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 text-gray-400 hover:text-[#FF6B35] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <FiChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 text-gray-400 hover:text-[#FF6B35] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <FiChevronRight size={16} />
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
