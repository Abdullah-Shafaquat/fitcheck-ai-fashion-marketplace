"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck, FiCheckSquare, FiChevronLeft, FiTrash2 } from "react-icons/fi";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?returnUrl=" + encodeURIComponent("/account/notifications"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      (prev || []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true })));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
      load();
    } finally {
      setBusy(false);
    }
  };

  const unread = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#FF6B35] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/account" className="hover:text-[#FF6B35] transition-colors">My Account</Link>
            <span>/</span>
            <span className="text-secondary font-medium">Notifications</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF6B35] transition-colors mb-6"
          >
            <FiChevronLeft size={15} />
            Back
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <FiBell size={22} className="text-[#FF6B35]" />
              <h1 className="text-2xl font-bold text-[#1F1F1F]">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 align-middle text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF6B35] text-white">
                    {unread} unread
                  </span>
                )}
              </h1>
            </div>
            {(notifications || []).length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={markAllRead}
                  disabled={busy || unread === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#FF6B35] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40"
                >
                  <FiCheckSquare size={13} />
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 bg-white border border-gray-200 rounded-xl hover:bg-red-50 disabled:opacity-40"
                >
                  <FiTrash2 size={13} />
                  Clear all
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (notifications || []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <FiBell size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#1F1F1F]">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">You'll see order updates here as they happen.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(notifications || []).map((n) => (
                <div
                  key={n.id}
                  className={`bg-white rounded-2xl border p-4 flex items-start gap-3 hover:shadow-sm transition-shadow ${
                    !n.read ? "border-[#FF6B35]/30" : "border-gray-100"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      n.read ? "bg-gray-100 text-gray-400" : "bg-[#FF6B35]/10 text-[#FF6B35]"
                    }`}
                  >
                    <FiBell size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#1F1F1F]">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#FF6B35] flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                    <p className="text-[11px] text-gray-300 mt-1.5">{formatFullDate(n.createdAt)}</p>
                    <div className="flex gap-3 mt-2.5">
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => markRead(n.id)}
                          className="text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b]"
                        >
                          View details
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600"
                        >
                          <FiCheck size={12} />
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
