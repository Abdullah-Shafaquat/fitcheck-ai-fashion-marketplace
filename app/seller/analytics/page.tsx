"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiShoppingBag,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiAlertCircle,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface DailyEntry {
  date: string;
  sales: number;
  units: number;
  orders: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface AnalyticsData {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    refundedOrders: number;
    totalSales: number;
    totalUnits: number;
    soldAmount: number;
    topProducts: TopProduct[];
  };
  daily: DailyEntry[];
  totals: {
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
    avgOrderValue: number;
    netEarnings: number;
  };
}

export default function SellerAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/seller/analytics");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load your analytics. Please try again.");
      }
    } catch {
      setError("Failed to load your analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const daily = data?.daily || [];
  const maxSales = Math.max(...daily.map((d) => d.sales), 1);

  const statCards = [
    {
      label: "Total Orders",
      value: data?.totals?.totalOrders || 0,
      icon: FiShoppingBag,
      gradient: "bg-emerald-500",
    },
    {
      label: "Total Units",
      value: data?.totals?.totalUnits || 0,
      icon: FiPackage,
      gradient: "bg-blue-500",
    },
    {
      label: "Total Revenue",
      value: data?.totals?.totalRevenue || 0,
      icon: FiDollarSign,
      gradient: "bg-purple-500",
      prefix: "Rs ",
    },
    {
      label: "Avg Order Value",
      value: data?.totals?.avgOrderValue || 0,
      icon: FiTrendingUp,
      gradient: "bg-[#FF6B35]",
      prefix: "Rs ",
    },
  ];

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${card.gradient} opacity-[0.07] blur-2xl`}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className="text-2xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
                      {card.prefix || ""}
                      {(card.value as number).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-2xl ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-[#1F1F1F] mb-4">
            Sales — Last 30 Days
          </h2>
          {daily.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No data available
            </p>
          ) : (
            <div className="flex items-end gap-1 h-48">
              {daily.map((d, i) => {
                const height = (d.sales / maxSales) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 group relative"
                    title={`${d.date}: Rs ${d.sales.toLocaleString()}`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1F1F1F] text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Rs {d.sales.toLocaleString()}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-[#FF6B35] to-[#ff8f66] rounded-t-md transition-all duration-300 hover:opacity-80"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-[#1F1F1F]">Top Products</h2>
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
                {(data?.stats?.topProducts || []).map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-semibold text-[#1F1F1F]">
                      {p.name}
                    </td>
                    <td className="px-6 py-3.5 tabular-nums text-gray-600">
                      {p.qty}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                      Rs {p.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {(!data?.stats?.topProducts ||
                  data.stats.topProducts.length === 0) && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-gray-400 text-sm"
                    >
                      No product data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
