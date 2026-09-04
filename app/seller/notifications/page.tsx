"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck, FiAlertCircle } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SellerNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/seller/notifications");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setError("Failed to load your notifications. Please try again.");
      }
    } catch {
      setError("Failed to load your notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/seller/notifications", {
        method: "PATCH",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <PageTransition className="h-full">
      <div className="space-y-6 max-w-3xl">
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              {markingAll ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiCheck size={14} />
              )}
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FiBell size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              No notifications
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Wrapper = n.link ? "a" : "div";
              const wrapperProps = n.link
                ? { href: n.link }
                : {};
              return (
                <Wrapper
                  key={n.id}
                  {...wrapperProps}
                  className={`block bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                    n.read
                      ? "border-gray-100"
                      : "border-[#FF6B35]/20 bg-[#FF6B35]/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] flex-shrink-0 mt-1.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-bold ${
                            n.read ? "text-gray-600" : "text-[#1F1F1F]"
                          }`}
                        >
                          {n.title}
                        </h3>
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
