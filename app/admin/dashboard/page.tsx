"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Spinner from "@/Components/ui/Spinner";
import {
  FiPackage,
  FiShoppingBag,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiAlertTriangle,
  FiStar,
  FiArrowRight,
  FiEye,
  FiChevronRight,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

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
  categories: { name: string; count: number }[];
  genderDistribution: { name: string; count: number }[];
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
    slug: string;
  }[];
}

interface OrdersData {
  orders: {
    id: string;
    orderNo: string;
    customer: string;
    email: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentProvider: string;
    date: string;
    itemCount: number;
  }[];
  stats: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    deliveredOrders: number;
  };
}

function useCountUp(target: number, duration = 800, delay = 0) {
  const [val, setVal] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setVal(0);
      return;
    }
    const start = performance.now() + delay;
    let started = false;
    const animate = (now: number) => {
      if (!started && now >= start) started = true;
      if (!started) {
        frame.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, delay]);

  return val;
}

function StatCard({
  label,
  value,
  prefix,
  suffix,
  icon: Icon,
  gradient,
  iconColor,
  href,
  delay,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  href: string;
  delay: number;
}) {
  const count = useCountUp(value, 900, delay);

  return (
    <Link
      href={href}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-black/[0.04] hover:border-gray-200 transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Background gradient blob */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${gradient} opacity-[0.07] blur-2xl group-hover:opacity-[0.12] group-hover:scale-125 transition-all duration-500`}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
            {prefix}
            {count.toLocaleString()}
            {suffix}
          </p>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
        >
          <Icon size={22} className={iconColor} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-[#FF6B35] transition-colors">
        <span>View details</span>
        <FiChevronRight
          size={12}
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </div>
    </Link>
  );
}

function MiniStatRow({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center justify-between py-2.5 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center transition-transform duration-200 ${
            hovered ? "scale-110" : ""
          }`}
        >
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-[#1F1F1F] tabular-nums">
        {value}
      </span>
    </div>
  );
}

function CategoryBar({
  name,
  count,
  max,
  delay,
}: {
  name: string;
  count: number;
  max: number;
  delay: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-600 font-medium">{name}</span>
        <span className="text-gray-400 tabular-nums">{count}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] to-[#ff8f66] transition-all duration-700 ease-out"
          style={{
            width: mounted ? `${(count / max) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
}

function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setFetchError(null);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/orders"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setOrdersData(await ordersRes.json());
      if (!statsRes.ok && !ordersRes.ok) {
        setFetchError("Failed to load dashboard data");
      }
    } catch {
      setFetchError("Network error — could not load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const statCards = [
    {
      label: "Total Products",
      value: stats?.totalProducts || 0,
      icon: FiPackage,
      gradient: "bg-blue-500",
      iconColor: "text-white",
      href: "/admin/products",
      delay: 0,
    },
    {
      label: "Total Orders",
      value: ordersData?.stats?.totalOrders || 0,
      icon: FiShoppingBag,
      gradient: "bg-emerald-500",
      iconColor: "text-white",
      href: "/admin/orders",
      delay: 80,
    },
    {
      label: "Revenue",
      value: ordersData?.stats?.totalRevenue || 0,
      prefix: "Rs ",
      icon: FiDollarSign,
      gradient: "bg-purple-500",
      iconColor: "text-white",
      href: "/admin/analytics",
      delay: 160,
    },
    {
      label: "Active Products",
      value: stats?.activeProducts || 0,
      icon: FiTrendingUp,
      gradient: "bg-[#FF6B35]",
      iconColor: "text-white",
      href: "/admin/products",
      delay: 240,
    },
  ];

  return (
    <PageTransition className="h-full">
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Welcome back, Admin. Here&apos;s what&apos;s happening today.
          </p>
        </div>
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

      {fetchError && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-red-700">Couldn&apos;t load dashboard data</p>
              <p className="text-xs text-red-500 mt-0.5">{fetchError}. Try refreshing.</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors"
          >
            <FiRefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="text-sm font-bold text-[#1F1F1F]">
                Recent Orders
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Latest {Math.min(5, ordersData?.orders?.length || 0)} orders
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FF6B35]/5"
            >
              View All
              <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {(ordersData?.orders || []).slice(0, 5).map((order, i) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <td className="px-6 py-3.5 font-semibold text-[#1F1F1F] font-mono text-xs">
                      {order.orderNo}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {order.customer}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#1F1F1F]">
                      Rs {order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${
                          order.status === "Delivered"
                            ? "bg-emerald-50 text-emerald-600"
                            : order.status === "Shipped"
                              ? "bg-blue-50 text-blue-600"
                              : order.status === "Processing"
                                ? "bg-amber-50 text-amber-600"
                                : order.status === "Pending"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-red-50 text-red-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {formatOrderDate(order.date)}
                    </td>
                  </tr>
                ))}
                {(!ordersData?.orders || ordersData.orders.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-400 text-sm"
                    >
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Low Stock Alert */}
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
                  {(stats?.lowStockProducts || []).length} product
                  {(stats?.lowStockProducts || []).length !== 1 ? "s" : ""} need
                  attention
                </p>
              </div>
            </div>
            <div className="p-4">
              {(stats?.lowStockProducts || []).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                    <FiTrendingUp size={16} className="text-emerald-500" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    All products well stocked
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.lowStockProducts.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#1F1F1F] truncate">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                p.stock <= 5
                                  ? "bg-red-500"
                                  : p.stock <= 15
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min((p.stock / 50) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                            {p.stock}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <FiEye size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-[#1F1F1F] mb-3">
              Quick Stats
            </h2>
            <div className="divide-y divide-gray-50">
              <MiniStatRow
                label="Featured"
                value={stats?.featuredProducts || 0}
                icon={<FiStar size={13} className="text-amber-500" />}
                color="bg-amber-50"
              />
              <MiniStatRow
                label="Avg. Rating"
                value={
                  stats?.averageRating
                    ? `${stats.averageRating.toFixed(1)} ★`
                    : "—"
                }
                icon={<FiStar size={13} className="text-amber-500" />}
                color="bg-amber-50"
              />
              <MiniStatRow
                label="Total Reviews"
                value={(stats?.totalReviews || 0).toLocaleString()}
                icon={<FiStar size={13} className="text-orange-400" />}
                color="bg-orange-50"
              />
              <MiniStatRow
                label="Latest Arrivals"
                value={stats?.latestProducts || 0}
                icon={<FiTrendingUp size={13} className="text-emerald-500" />}
                color="bg-emerald-50"
              />
              <MiniStatRow
                label="Total Stock"
                value={`${(stats?.totalStock || 0).toLocaleString()}`}
                icon={<FiPackage size={13} className="text-blue-500" />}
                color="bg-blue-50"
              />
              <MiniStatRow
                label="Avg. Price"
                value={`Rs ${(stats?.averagePrice || 0).toLocaleString()}`}
                icon={<FiDollarSign size={13} className="text-purple-500" />}
                color="bg-purple-50"
              />
              <MiniStatRow
                label="Catalog Value"
                value={`Rs ${(stats?.catalogValue || 0).toLocaleString()}`}
                icon={<FiTrendingUp size={13} className="text-[#FF6B35]" />}
                color="bg-orange-50"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-[#1F1F1F] mb-4">
              Categories
            </h2>
            <div className="space-y-3">
              {(stats?.categories || []).map((cat, i) => {
                const maxCount = Math.max(
                  ...(stats?.categories || []).map((c) => c.count),
                  1
                );
                return (
                  <CategoryBar
                    key={cat.name}
                    name={cat.name}
                    count={cat.count}
                    max={maxCount}
                    delay={i * 100 + 200}
                  />
                );
              })}
              {(!stats?.categories || stats.categories.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-4">
                  No categories
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
