"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiShieldOff, FiShield, FiMail, FiUser } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface BlockedEmail {
  id: string;
  email: string;
  reason: string | null;
  reasonDetails: string | null;
  blockedAt: string;
  blockedBy: string | null;
  unblockedAt: string | null;
  unblockedBy: string | null;
  isActive: boolean;
  status: string;
}

export default function AdminBlockedEmailsPage() {
  const [list, setList] = useState<BlockedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blocked-emails");
      const data = await res.json();
      setList(data.blockedEmails || []);
      if (!res.ok) setError(data.error || "Failed to load blocked emails");
    } catch {
      setError("Network error — could not load blocked emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = list.filter((b) => {
    const matchSearch = b.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || b.status === filter;
    return matchSearch && matchFilter;
  });

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB") : "—";

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">Blocked Emails</h1>
          <p className="text-sm text-gray-400 mt-1">
            Emails on this list cannot create accounts, sign in, or place orders. Managed from customer detail pages.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Entries", value: String(list.length), icon: FiMail, color: "bg-blue-50 text-blue-600" },
            { label: "Blocked", value: String(list.filter((b) => b.isActive).length), icon: FiShieldOff, color: "bg-red-50 text-red-600" },
            { label: "Unblocked", value: String(list.filter((b) => !b.isActive).length), icon: FiShield, color: "bg-emerald-50 text-emerald-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{s.label}</p>
                  <p className="text-xl font-black text-[#1F1F1F]">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex-1 focus-within:border-[#FF6B35]/30 transition-all">
            <FiMail className="text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blocked emails..."
              className="flex-1 outline-none text-sm text-[#1F1F1F]"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-[#1F1F1F] font-medium focus:border-[#FF6B35]/30 outline-none transition-all"
          >
            {["All", "Blocked", "Unblocked"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 text-sm">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-50">
                    {["Email", "Status", "Reason", "Blocked On", "Blocked By", "Unblocked On"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#1F1F1F] flex items-center gap-1.5">
                          {b.isActive ? <FiShieldOff size={13} className="text-red-500" /> : <FiShield size={13} className="text-emerald-500" />}
                          {b.email}
                        </p>
                        {b.reasonDetails && <p className="text-[10px] text-gray-400 mt-0.5">{b.reasonDetails}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${b.isActive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{b.reason || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{fmt(b.blockedAt)}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{b.blockedBy || "admin"}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{b.unblockedBy ? `${fmt(b.unblockedAt)} by ${b.unblockedBy}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {list.length === 0 ? "No blocked emails yet" : "No matches found"}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <FiUser size={12} /> To block or unblock a customer, open their record from the Customers page.
        </p>
      </div>
    </PageTransition>
  );
}
