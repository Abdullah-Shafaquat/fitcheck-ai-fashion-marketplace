"use client";

import React, { useState, useEffect } from "react";
import {
  FiPackage,
  FiDollarSign,
  FiShoppingBag,
  FiStar,
  FiAlertTriangle,
  FiPieChart,
  FiUsers,
} from "react-icons/fi";
import { motion } from "motion/react";
import PageTransition from "@/Components/admin/PageTransition";

interface Category {
  name: string;
  count: number;
}

interface Gender {
  name: string;
  count: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  slug: string;
}

interface Stats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  latestProducts: number;
  totalStock: number;
  averagePrice: number;
  catalogValue: number;
  averageRating: number;
  totalReviews: number;
  categories: Category[];
  genderDistribution: Gender[];
  lowStockProducts: LowStockProduct[];
}

const CHART_COLORS = [
  "#FF6B35",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
];

const GENDER_COLORS: Record<string, string> = {
  Men: "from-blue-500 to-blue-400",
  Women: "from-pink-500 to-pink-400",
  Kids: "from-emerald-500 to-emerald-400",
  Unisex: "from-gray-500 to-gray-400",
};

function DonutChart({
  data,
  size = 180,
  thickness = 22,
}: {
  data: { name: string; count: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        No data available yet
      </div>
    );
  }

  const segments = data.reduce<
    { name: string; color: string; dash: number; offset: number }[]
  >((acc, d) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.dash : 0;
    const dash = (d.count / total) * circumference;
    return [...acc, { name: d.name, color: d.color, dash, offset }];
  }, []);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Donut chart of product distribution"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={thickness}
        />
        {segments.map((d) => (
          <motion.circle
            key={d.name}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${d.dash} ${circumference - d.dash}`}
            strokeDashoffset={-d.offset}
            strokeLinecap="butt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-black text-[#1F1F1F] tabular-nums">
          {total}
        </p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
          Products
        </p>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // ignore — default empty stats shown below
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400 font-medium">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  const maxGender = Math.max(
    ...(stats?.genderDistribution || []).map((g) => g.count),
    1
  );

  const donutData = (stats?.categories || []).map((c, i) => ({
    ...c,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Catalog Value",
              value: `Rs ${(stats?.catalogValue || 0).toLocaleString()}`,
              icon: FiDollarSign,
              gradient: "bg-emerald-500",
            },
            {
              label: "Avg. Rating",
              value: `${stats?.averageRating || 0} ★`,
              icon: FiStar,
              gradient: "bg-amber-500",
            },
            {
              label: "Total Stock",
              value: `${(stats?.totalStock || 0).toLocaleString()}`,
              icon: FiPackage,
              gradient: "bg-purple-500",
            },
            {
              label: "Products",
              value: `${stats?.totalProducts || 0}`,
              icon: FiShoppingBag,
              gradient: "bg-[#FF6B35]",
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${m.gradient} rounded-xl flex items-center justify-center`}
                  >
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                      {m.label}
                    </p>
                    <p className="text-xl font-black text-[#1F1F1F] tabular-nums">
                      {m.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut + Gender bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <FiPieChart className="text-[#FF6B35]" size={16} />
              <h3 className="text-sm font-bold text-[#1F1F1F]">
                Category Distribution
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart data={donutData} />
              <div className="flex-1 w-full space-y-3">
                {donutData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="flex-1 font-medium text-gray-600 truncate">
                      {c.name}
                    </span>
                    <span className="text-gray-400 tabular-nums">
                      {c.count} ({Math.round((c.count / Math.max(donutData.reduce((s, d) => s + d.count, 0), 1)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <FiUsers className="text-[#FF6B35]" size={16} />
              <h3 className="text-sm font-bold text-[#1F1F1F]">
                Products by Gender
              </h3>
            </div>
            <div className="space-y-4">
              {(stats?.genderDistribution || []).map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-600">{g.name}</span>
                    <span className="text-gray-400 tabular-nums">
                      {g.count} products
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className={`bg-gradient-to-r ${GENDER_COLORS[g.name] || "from-[#FF6B35] to-[#ff8f66]"} rounded-full h-2.5`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(g.count / maxGender) * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status, reviews, price, low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-[#1F1F1F] mb-6">
              Product Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Active",
                  value: stats?.activeProducts || 0,
                  color: "bg-emerald-500",
                },
                {
                  label: "Inactive",
                  value: stats?.inactiveProducts || 0,
                  color: "bg-gray-400",
                },
                {
                  label: "Featured",
                  value: stats?.featuredProducts || 0,
                  color: "bg-amber-500",
                },
                {
                  label: "New Arrivals",
                  value: stats?.latestProducts || 0,
                  color: "bg-blue-500",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-gray-50 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-3 h-3 ${s.color} rounded-full mx-auto mb-2`}
                  />
                  <p className="text-2xl font-black text-[#1F1F1F] tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1 font-semibold">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-[#1F1F1F] mb-6">
              Price Overview
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <p className="text-xs text-gray-400">Average Product Price</p>
                <p className="text-2xl font-black text-[#1F1F1F] mt-1 tabular-nums">
                  Rs {(stats?.averagePrice || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <p className="text-xs text-gray-400">Total Catalog Value</p>
                <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                  Rs {(stats?.catalogValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <p className="text-xs text-gray-400">Total Units in Stock</p>
                <p className="text-2xl font-black text-blue-600 mt-1 tabular-nums">
                  {(stats?.totalStock || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <p className="text-xs text-gray-400">Reviews</p>
                <p className="text-2xl font-black text-amber-600 mt-1 tabular-nums">
                  {stats?.totalReviews || 0}{" "}
                  <span className="text-sm font-semibold text-gray-400">
                    ({stats?.averageRating || 0}★ avg)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="text-amber-500" size={16} />
            <h3 className="text-sm font-bold text-[#1F1F1F]">
              Low Stock Alerts
            </h3>
          </div>
          {(stats?.lowStockProducts || []).length === 0 ? (
            <p className="text-sm text-gray-400">
              All products are well stocked. 🎉
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(stats?.lowStockProducts || []).map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <FiPackage className="text-amber-600" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1F1F1F] truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.slug}</p>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${
                      p.stock === 0
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
