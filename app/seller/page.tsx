"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiShoppingBag,
  FiDollarSign,
  FiPackage,
  FiAlertTriangle,
  FiAlertCircle,
  FiTrendingUp,
  FiExternalLink,
  FiRefreshCw,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";
import Spinner from "@/Components/ui/Spinner";
import StatCard, { type StatTone } from "@/Components/ui/StatCard";

interface Summary {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalPaidOut: number;
  lowStock: {
    id: string;
    name: string;
    stock: number;
    lowStockThreshold: number | null;
  }[];
  stats: {
    totalOrders: number;
    totalSales: number;
    totalUnits: number;
    topProducts: {
      name: string;
      qty: number;
      revenue: number;
    }[];
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
  };
}

interface Seller {
  storeName: string;
  approvalStatus: string;
  logo: string | null;
  storeSlug: string;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/me");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSeller(data.seller);
        setSummary(data.summary);
      } else {
        setError("Failed to load your dashboard. Please try again.");
      }
    } catch {
      setError("Failed to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner label="Loading dashboard..." />
      </div>
    );
  }

  const statCards: {
    label: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    tone: StatTone;
    href: string;
    prefix: string;
  }[] = [
    {
      label: "Total Orders",
      value: summary?.stats?.totalOrders || 0,
      icon: FiShoppingBag,
      tone: "emerald",
      href: "/seller/orders",
      prefix: "",
    },
    {
      label: "Total Sales",
      value: summary?.stats?.totalSales || 0,
      icon: FiDollarSign,
      tone: "purple",
      href: "/seller/analytics",
      prefix: "Rs ",
    },
    {
      label: "Total Units",
      value: summary?.stats?.totalUnits || 0,
      icon: FiPackage,
      tone: "blue",
      href: "/seller/products",
      prefix: "",
    },
    {
      label: "Available Balance",
      value: summary?.availableBalance || 0,
      icon: FiDollarSign,
      tone: "primary",
      href: "/seller/payouts",
      prefix: "Rs ",
    },
  ];

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Welcome back{seller?.storeName ? `, ${seller.storeName}` : ""}.
              Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex items-center gap-2">
          {seller?.storeSlug && (
            <Link
              href={`/store/${seller.storeSlug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-95"
            >
              <FiExternalLink size={14} className="text-[#FF6B35]" />
              <span className="hidden sm:inline">View my store</span>
            </Link>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              prefix={card.prefix}
              href={card.href}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div>
                <h2 className="text-sm font-bold text-[#1F1F1F]">
                  Top Selling Products
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Your best performing items
                </p>
              </div>
              <Link
                href="/seller/products"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FF6B35]/5"
              >
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Units Sold
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.stats?.topProducts || []).map((p) => (
                    <tr
                      key={p.name}
                      className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-[#1F1F1F]">
                          {p.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 tabular-nums">
                        {p.qty}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                        Rs {p.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(!summary?.stats?.topProducts ||
                    summary.stats.topProducts.length === 0) && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-12 text-center text-gray-400 text-sm"
                      >
                        No sales data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            {(summary && summary.lowStock.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <FiAlertTriangle size={15} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1F1F1F]">
                      Low Stock Alert
                    </h2>
                    <p className="text-[10px] text-gray-400">
                      {summary.lowStock.length} product
                      {summary.lowStock.length !== 1 ? "s" : ""} need attention
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <Link
                    href="/seller/products"
                    className="block text-center text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors"
                  >
                    View Products →
                  </Link>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-[#1F1F1F] mb-3">
                Quick Stats
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Pending Orders", value: summary?.stats?.pendingOrders || 0 },
                  { label: "Processing", value: summary?.stats?.processingOrders || 0 },
                  { label: "Shipped", value: summary?.stats?.shippedOrders || 0 },
                  { label: "Delivered", value: summary?.stats?.deliveredOrders || 0 },
                  { label: "Cancelled", value: summary?.stats?.cancelledOrders || 0 },
                  { label: "Refunded", value: summary?.stats?.refundedOrders || 0 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-bold text-[#1F1F1F] tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {seller?.storeSlug && (
              <Link
                href={`/store/${seller.storeSlug}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-[#1F1F1F] hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <FiExternalLink size={14} />
                View Storefront
              </Link>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
