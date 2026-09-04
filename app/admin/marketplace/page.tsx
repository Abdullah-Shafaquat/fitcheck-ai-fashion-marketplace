"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiShieldOff,
  FiPackage,
  FiAlertTriangle,
  FiDollarSign,
  FiTrendingUp,
  FiArrowRight,
  FiChevronRight,
  FiGrid,
  FiSettings,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface TopSeller {
  id: string;
  storeName: string;
  totalEarnings: number;
  productCount: number;
}

interface TopProduct {
  name: string;
  net: number;
}

interface Analytics {
  totalSellers: number;
  approvedSellers: number;
  pendingSellers: number;
  blockedSellers: number;
  sellerProducts: number;
  pendingProductApprovals: number;
  payoutPending: number;
  totalPaidOut: number;
  gmv: number;
  commissionRevenue: number;
  topSellers: TopSeller[];
  topProducts: TopProduct[];
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
        <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export default function MarketplaceOverviewPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/marketplace/analytics");
        const data = await res.json();
        setAnalytics(data.analytics || null);
        if (!res.ok) setFetchError(data.error || "Failed to load analytics");
      } catch {
        setFetchError("Network error — could not load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-red-500">{fetchError}</p>
      </div>
    );
  }

  const a = analytics!;

  const statCards = [
    { label: "Total Sellers", value: a.totalSellers, icon: FiUsers, gradient: "bg-blue-500", iconColor: "text-white", href: "/admin/marketplace/sellers", delay: 0 },
    { label: "Approved", value: a.approvedSellers, icon: FiCheckCircle, gradient: "bg-emerald-500", iconColor: "text-white", href: "/admin/marketplace/sellers", delay: 60 },
    { label: "Pending", value: a.pendingSellers, icon: FiClock, gradient: "bg-amber-500", iconColor: "text-white", href: "/admin/marketplace/sellers", delay: 120 },
    { label: "Blocked", value: a.blockedSellers, icon: FiShieldOff, gradient: "bg-red-500", iconColor: "text-white", href: "/admin/marketplace/sellers", delay: 180 },
    { label: "Seller Products", value: a.sellerProducts, icon: FiPackage, gradient: "bg-purple-500", iconColor: "text-white", href: "/admin/marketplace/products", delay: 240 },
    { label: "Pending Approvals", value: a.pendingProductApprovals, icon: FiAlertTriangle, gradient: "bg-[#FF6B35]", iconColor: "text-white", href: "/admin/marketplace/products", delay: 300 },
    { label: "Pending Payouts", value: a.payoutPending, icon: FiDollarSign, gradient: "bg-indigo-500", iconColor: "text-white", href: "/admin/marketplace/payouts", delay: 360 },
    { label: "Total Paid Out", value: a.totalPaidOut, prefix: "Rs ", icon: FiDollarSign, gradient: "bg-teal-500", iconColor: "text-white", href: "/admin/marketplace/payouts", delay: 420 },
    { label: "GMV", value: a.gmv, prefix: "Rs ", icon: FiTrendingUp, gradient: "bg-pink-500", iconColor: "text-white", href: "/admin/marketplace", delay: 480 },
    { label: "Commission Revenue", value: a.commissionRevenue, prefix: "Rs ", icon: FiTrendingUp, gradient: "bg-orange-500", iconColor: "text-white", href: "/admin/marketplace", delay: 540 },
  ];

  const quickLinks = [
    { label: "Sellers", href: "/admin/marketplace/sellers", icon: FiUsers, gradient: "bg-blue-500" },
    { label: "Product Approvals", href: "/admin/marketplace/products", icon: FiPackage, gradient: "bg-purple-500" },
    { label: "Payouts", href: "/admin/marketplace/payouts", icon: FiDollarSign, gradient: "bg-emerald-500" },
    { label: "Settings", href: "/admin/marketplace/settings", icon: FiSettings, gradient: "bg-gray-700" },
  ];

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center">
              <FiGrid size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F1F1F]">Marketplace</h1>
              <p className="text-xs text-gray-400">Overview & analytics</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-200 group"
              >
                <div className={`w-10 h-10 ${link.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1F1F1F] group-hover:text-[#FF6B35] transition-colors">{link.label}</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    Open <FiArrowRight size={9} />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-[#1F1F1F]">Top Sellers</h2>
              <Link href="/admin/marketplace/sellers" className="text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors flex items-center gap-1">
                View All <FiArrowRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Store</th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Earnings</th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Products</th>
                  </tr>
                </thead>
                <tbody>
                  {a.topSellers.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">No sellers yet</td></tr>
                  ) : a.topSellers.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/marketplace/sellers/${s.id}`} className="font-semibold text-[#FF6B35] hover:underline">
                          {s.storeName}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#1F1F1F]">Rs {s.totalEarnings.toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-gray-600">{s.productCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-[#1F1F1F]">Top Products</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {a.topProducts.length === 0 ? (
                    <tr><td colSpan={2} className="px-6 py-12 text-center text-gray-400 text-sm">No products yet</td></tr>
                  ) : a.topProducts.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-[#1F1F1F]">{p.name}</td>
                      <td className="px-6 py-3.5 font-bold text-[#1F1F1F]">Rs {p.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
