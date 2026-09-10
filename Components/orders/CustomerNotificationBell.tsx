"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FiBell, FiCheck } from "react-icons/fi";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function CustomerNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        setNotifications(null);
        return;
      }
      setNotifications(data.notifications || []);
    } catch {
      setNotifications(null);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [now] = useState(() => Date.now());

  if (notifications === null) return null;

  const unread = notifications.filter((n) => !n.read).length;

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
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => (prev || []).map((n) => ({ ...n, read: true })));
  };

  const timeAgo = (iso: string) => {
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-600 hover:text-[#FF6B35] transition-colors"
        aria-label="Notifications"
      >
        <FiBell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF6B35] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-bold text-[#1F1F1F]">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#FF6B35] hover:text-[#e05a2b]"
              >
                <FiCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.slice(0, 15).map((n) => (
                <li key={n.id} className="border-b border-gray-50 last:border-0">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className={`block px-4 py-3 hover:bg-gray-50 ${!n.read ? "bg-[#FF6B35]/5" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#1F1F1F]">{n.title}</p>
                        <span className="text-[9px] text-gray-300 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </Link>
                  ) : (
                    <div
                      className={`px-4 py-3 ${!n.read ? "bg-[#FF6B35]/5" : ""}`}
                      onClick={() => markRead(n.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#1F1F1F]">{n.title}</p>
                        <span className="text-[9px] text-gray-300 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {notifications.length > 0 && (
            <div className="border-t border-gray-50">
              <Link
                href="/account/notifications"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 text-xs font-semibold text-[#FF6B35] hover:bg-gray-50"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
