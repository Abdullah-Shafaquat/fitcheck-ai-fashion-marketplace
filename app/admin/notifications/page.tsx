"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiTrash2,
  FiFilter,
  FiPackage,
  FiDollarSign,
  FiTruck,
  FiAlertCircle,
  FiInfo,
  FiRefreshCw,
  FiClock,
  FiArrowRight,
  FiX,
} from "react-icons/fi";
import { useToast } from "@/Components/admin/Toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  order: { icon: FiPackage, color: "text-blue-600", bg: "bg-blue-50", label: "Order" },
  payment: { icon: FiDollarSign, color: "text-emerald-600", bg: "bg-emerald-50", label: "Payment" },
  shipping: { icon: FiTruck, color: "text-purple-600", bg: "bg-purple-50", label: "Shipping" },
  product: { icon: FiPackage, color: "text-orange-600", bg: "bg-orange-50", label: "Product" },
  import: { icon: FiPackage, color: "text-teal-600", bg: "bg-teal-50", label: "Import" },
  error: { icon: FiAlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Error" },
  info: { icon: FiInfo, color: "text-gray-600", bg: "bg-gray-50", label: "Info" },
};

export default function AdminNotificationsPage() {
  const { success, error: toastError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unread", "true");
      const res = await fetch(`/api/admin/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      toastError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter, toastError]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
    } catch {
      toastError("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/admin/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      success("All notifications marked as read");
    } catch {
      toastError("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: string) => {
    setDeleting(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
      success("Notification deleted");
    } catch {
      toastError("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL notifications? This cannot be undone.")) return;
    setNotifications([]);
    try {
      await fetch("/api/admin/notifications/clear-all", { method: "DELETE" });
      success("All notifications cleared");
    } catch {
      toastError("Failed to clear all");
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center">
              <FiBell size={20} className="text-[#FF6B35]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1F1F1F]">Notifications</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
            >
              <FiCheckCircle size={14} />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition"
            >
              <FiTrash2 size={14} />
              <span className="hidden sm:inline">Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
            filter === "all"
              ? "bg-white text-[#1F1F1F] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
            filter === "unread"
              ? "bg-white text-[#1F1F1F] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#FF6B35] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiBell size={28} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-[#1F1F1F] mb-1">No notifications</h3>
          <p className="text-sm text-gray-400">
            {filter === "unread"
              ? "All notifications have been read"
              : "Notifications from orders, payments, and products will appear here"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {notifications.map((n) => {
            const config = typeConfig[n.type] || typeConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50/50 ${
                  !n.read ? "bg-[#FF6B35]/[0.02]" : ""
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}
                >
                  <Icon size={18} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#FF6B35] flex-shrink-0" />
                        )}
                        <h4 className={`text-sm font-bold truncate ${!n.read ? "text-[#1F1F1F]" : "text-gray-700"}`}>
                          {n.title}
                        </h4>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className={`text-sm ${!n.read ? "text-gray-700" : "text-gray-400"} line-clamp-2`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FiClock size={11} />
                          {formatTime(n.createdAt)}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            className="flex items-center gap-1 text-xs font-semibold text-[#FF6B35] hover:underline"
                          >
                            View <FiArrowRight size={11} />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          title="Mark as read"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <FiCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        disabled={deleting === n.id}
                        title="Delete"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
