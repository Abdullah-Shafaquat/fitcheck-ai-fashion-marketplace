"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiLogOut,
  FiBell,
  FiUser,
  FiChevronDown,
  FiSearch,
  FiX,
  FiCheck,
  FiPackage,
  FiShoppingBag,
  FiTruck,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import AdminProfileModal from "./AdminProfileModal";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const notifIcon: Record<string, React.ElementType> = {
  order: FiShoppingBag,
  payment: FiCheckCircle,
  product: FiPackage,
  shipping: FiTruck,
  status: FiClock,
  import: FiPackage,
  alert: FiAlertCircle,
  default: FiBell,
};

const notifColor: Record<string, string> = {
  order: "bg-blue-50 text-blue-600",
  payment: "bg-emerald-50 text-emerald-600",
  product: "bg-purple-50 text-purple-600",
  shipping: "bg-amber-50 text-amber-600",
  status: "bg-indigo-50 text-indigo-600",
  import: "bg-teal-50 text-teal-600",
  alert: "bg-red-50 text-red-600",
  default: "bg-gray-50 text-gray-600",
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, action }) => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    document.cookie = "adminAuth=; path=/; max-age=0";
    router.push("/admin/login");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const getNotifIcon = (type: string) => notifIcon[type] || notifIcon.default;
  const getNotifColor = (type: string) => notifColor[type] || notifColor.default;

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 sticky top-0" style={{ zIndex: 40 }}>
        {/* Left - Title */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium tracking-wide uppercase mb-0.5">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#FF6B35]">{title}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1F1F1F] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div
            className={`hidden md:flex items-center gap-2 rounded-xl border transition-all duration-200 ${
              searchFocused
                ? "border-[#FF6B35]/30 bg-white shadow-sm shadow-[#FF6B35]/5 ring-1 ring-[#FF6B35]/10"
                : "border-gray-200 bg-gray-50"
            } ${searchFocused ? "w-64" : "w-48"}`}
          >
            <FiSearch
              size={15}
              className={`ml-3 flex-shrink-0 transition-colors ${
                searchFocused ? "text-[#FF6B35]" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[#1F1F1F] placeholder:text-gray-400 py-2 pr-3"
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal("")}
                className="mr-2 text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={14} />
              </button>
            )}
            <kbd className="hidden lg:inline-flex mr-3 text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowDropdown(false);
              }}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 active:scale-95"
              aria-label="Notifications"
            >
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF6B35] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-[#FF6B35]/30 animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ zIndex: 9999 }}>
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-[#1F1F1F]">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <FiBell size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const Icon = getNotifIcon(n.type);
                      const colorClass = getNotifColor(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            if (n.link) {
                              setShowNotifs(false);
                              router.push(n.link);
                            }
                          }}
                          className={`px-5 py-3.5 flex items-start gap-3 cursor-pointer transition-colors duration-150 ${
                            !n.read
                              ? "bg-[#FF6B35]/[0.03] hover:bg-[#FF6B35]/[0.06]"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm ${
                                !n.read
                                  ? "font-semibold text-[#1F1F1F]"
                                  : "text-gray-600"
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-300 mt-1">
                              {formatTimeAgo(n.createdAt)}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 rounded-full bg-[#FF6B35] flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 text-center">
                    <button
                      onClick={() => {
                        setShowNotifs(false);
                        router.push("/admin/notifications");
                      }}
                      className="text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center shadow-sm shadow-[#FF6B35]/20">
                <FiUser size={16} className="text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-[#1F1F1F] leading-none">
                  Admin
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Super Admin</p>
              </div>
              <FiChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 hidden sm:block ${
                  showDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ zIndex: 9999 }}>
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-[#1F1F1F]">
                    Admin Account
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    admin@fitcheck.pk
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowProfileModal(true);
                    }}
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1F1F1F] transition-colors text-left"
                  >
                    <FiUser size={16} className="text-gray-400" />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <FiLogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {action && action}

          {/* Logout (desktop only) */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200 text-sm font-semibold border border-red-100 active:scale-95"
          >
            <FiLogOut size={16} />
            <span className="hidden xl:inline">Logout</span>
          </button>
        </div>
      </header>

      <AdminProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onLogout={handleLogout}
      />
    </>
  );
};

export default AdminHeader;
