"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FiHome,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiCreditCard,
  FiBarChart2,
  FiBell,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiUser,
  FiShield,
} from "react-icons/fi";

const links = [
  { href: "/seller", label: "Dashboard", icon: FiHome },
  { href: "/seller/verification", label: "Verification", icon: FiShield },
  { href: "/seller/products", label: "Products", icon: FiPackage },
  { href: "/seller/orders", label: "Orders", icon: FiShoppingBag },
  { href: "/seller/earnings", label: "Earnings", icon: FiDollarSign },
  { href: "/seller/payouts", label: "Payouts", icon: FiCreditCard },
  { href: "/seller/analytics", label: "Analytics", icon: FiBarChart2 },
  { href: "/seller/notifications", label: "Notifications", icon: FiBell },
  { href: "/seller/profile", label: "Settings", icon: FiSettings },
];

const SellerSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("sellerSidebarCollapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => {
    setCollapsed((p) => {
      localStorage.setItem("sellerSidebarCollapsed", String(!p));
      return !p;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/seller/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/seller/login");
  };

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const activeIdx = links.findIndex((l) => isActive(l.href));

  const sidebarWidth = collapsed ? "w-20" : "w-64";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center ${collapsed ? "justify-center px-2 py-5" : "px-6 py-5"} border-b border-white/[0.06] transition-all duration-300`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center">
            <FiUser size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-white text-lg font-bold tracking-tight leading-none">
                FitCheck
              </h2>
              <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase mt-0.5">
                Seller Portal
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 relative">
        {!collapsed && activeIdx >= 0 && (
          <div
            ref={indicatorRef}
            className="absolute left-3 w-[calc(100%-24px)] h-11 bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-xl transition-all duration-300 ease-out"
            style={{ top: `${activeIdx * 48 + 16}px` }}
          />
        )}

        {links.map((link, i) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`
                relative flex items-center ${collapsed ? "justify-center" : "gap-3"} 
                ${collapsed ? "px-3 py-3" : "px-3"} h-11 rounded-xl
                transition-all duration-200 ease-out z-10 group
                ${
                  active
                    ? "text-white"
                    : "text-white/40 hover:text-white/90"
                }
              `}
              title={collapsed ? link.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 transition-colors duration-200 ${
                  active
                    ? "text-[#FF6B35]"
                    : "group-hover:text-white/80"
                }`}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {link.label}
                </span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
        <button
          onClick={handleLogout}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full px-3 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group`}
          title={collapsed ? "Logout" : undefined}
        >
          <FiLogOut
            size={20}
            className="flex-shrink-0 group-hover:rotate-180 transition-transform duration-300"
          />
          {!collapsed && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
        <p className="text-[10px] text-white/15 text-center pt-2">
          {collapsed ? "v2.0" : "v2.0.0 • © 2026"}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-11 h-11 bg-[#FF6B35] text-white rounded-xl shadow-lg shadow-[#FF6B35]/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="17" y2="6" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="14" x2="17" y2="14" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 z-[61] w-72 bg-[#111111] lg:hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center">
                <FiUser size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold tracking-tight leading-none">
                  FitCheck
                </h2>
                <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase mt-0.5">
                  Seller Portal
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="14" y2="14" />
                <line x1="14" y1="4" x2="4" y2="14" />
              </svg>
            </button>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 h-12 rounded-xl transition-all duration-200 group ${
                    active
                      ? "bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-white"
                      : "text-white/40 hover:text-white/90 hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={20}
                    className={
                      active
                        ? "text-[#FF6B35]"
                        : "group-hover:text-white/80"
                    }
                  />
                  <span className="text-sm font-medium">{link.label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/50" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 border-t border-white/[0.06] pt-3">
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <FiLogOut size={20} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>
      )}

      <aside
        className={`${sidebarWidth} bg-[#111111] min-h-screen flex-shrink-0 hidden lg:flex flex-col transition-all duration-300 ease-out relative`}
      >
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-7 w-6 h-6 bg-[#111111] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-[#FF6B35]/20 hover:border-[#FF6B35]/30 transition-all duration-200 z-20"
          aria-label="Toggle sidebar"
        >
          <FiChevronLeft
            size={12}
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
};

export default SellerSidebar;
