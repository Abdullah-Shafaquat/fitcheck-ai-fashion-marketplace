"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FiDollarSign,
  FiCheck,
  FiX,
  FiClock,
  FiExternalLink,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  accountDetails: { accountTitle: string; accountNumber: string; bankName: string } | null;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  seller: { storeName: string; storeSlug: string; id: string };
}

const STATUS_TABS = ["All", "PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "REJECTED", "FAILED"];

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-blue-50 text-blue-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  PROCESSING: "bg-indigo-50 text-indigo-600",
  PAID: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  FAILED: "bg-red-100 text-red-700",
};

export default function MarketplacePayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ kind: "paid" | "reject"; payoutId: string; paymentRef: string; adminNotes: string; reason: string } | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/marketplace/payouts?${params.toString()}`);
      const data = await res.json();
      setPayouts(data.payouts || []);
      if (!res.ok) setFetchError(data.error || "Failed to load payouts");
    } catch {
      setFetchError("Network error — could not load payouts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const act = async (payoutId: string, status: string, extra?: Record<string, string>) => {
    setBusyId(payoutId);
    try {
      const res = await fetch(`/api/admin/marketplace/payouts/${payoutId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (res.ok) fetchPayouts();
    } finally {
      setBusyId(null);
    }
  };

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <FiDollarSign size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F1F1F]">Payouts</h1>
            <p className="text-xs text-gray-400">Review and process seller payouts</p>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab
                  ? "bg-[#FF6B35] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-12 text-red-500 text-sm">{fetchError}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Seller", "Amount", "Method", "Account", "Status", "Requested", "Actions"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => {
                      const badge = statusBadge[payout.status] || "bg-gray-100 text-gray-500";
                      const acct = payout.accountDetails;
                      return (
                        <tr key={payout.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/admin/marketplace/sellers/${payout.seller.id}`} className="font-semibold text-[#FF6B35] text-xs hover:underline flex items-center gap-1">
                              {payout.seller.storeName}
                              <FiExternalLink size={10} />
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-[#1F1F1F]">Rs {payout.amount.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{payout.method}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">
                            {acct ? (
                              <div>
                                <p className="font-medium text-[#1F1F1F]">{acct.accountTitle}</p>
                                <p>{acct.accountNumber}</p>
                                <p className="text-gray-400">{acct.bankName}</p>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${badge}`}>
                              {payout.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs">{fmtDate(payout.requestedAt)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              {(payout.status === "PENDING" || payout.status === "UNDER_REVIEW") && (
                                <>
                                  <button
                                    onClick={() => act(payout.id, "APPROVED")}
                                    disabled={busyId === payout.id}
                                    title="Approve"
                                    className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => act(payout.id, "PROCESSING")}
                                    disabled={busyId === payout.id}
                                    title="Mark Processing"
                                    className="px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Processing
                                  </button>
                                  <button
                                    onClick={() => setActionModal({ kind: "reject", payoutId: payout.id, paymentRef: "", adminNotes: "", reason: "" })}
                                    disabled={busyId === payout.id}
                                    title="Reject"
                                    className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {payout.status === "APPROVED" && (
                                <button
                                  onClick={() => act(payout.id, "PROCESSING")}
                                  disabled={busyId === payout.id}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Processing
                                </button>
                              )}
                              {payout.status === "PROCESSING" && (
                                <button
                                  onClick={() => setActionModal({ kind: "paid", payoutId: payout.id, paymentRef: "", adminNotes: "", reason: "" })}
                                  disabled={busyId === payout.id}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {payouts.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No payouts found</div>
              )}
            </>
          )}
        </div>
      </div>

      {actionModal?.kind === "paid" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Mark as Paid</h3>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Reference</label>
            <input
              value={actionModal.paymentRef}
              onChange={(e) => setActionModal({ ...actionModal, paymentRef: e.target.value })}
              placeholder="e.g., bank transfer ID"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 mb-3"
            />
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Admin Notes</label>
            <textarea
              value={actionModal.adminNotes}
              onChange={(e) => setActionModal({ ...actionModal, adminNotes: e.target.value })}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  act(actionModal.payoutId, "PAID", { paymentReference: actionModal.paymentRef, adminNotes: actionModal.adminNotes });
                  setActionModal(null);
                }}
                disabled={busyId === actionModal.payoutId}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#e05a2b] rounded-xl transition-colors disabled:opacity-50"
              >
                {busyId === actionModal.payoutId ? "Saving..." : "Confirm Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal?.kind === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Reject Payout</h3>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason *</label>
            <textarea
              value={actionModal.reason}
              onChange={(e) => setActionModal({ ...actionModal, reason: e.target.value })}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  act(actionModal.payoutId, "REJECTED", { reason: actionModal.reason });
                  setActionModal(null);
                }}
                disabled={busyId === actionModal.payoutId || !actionModal.reason.trim()}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {busyId === actionModal.payoutId ? "Rejecting..." : "Reject Payout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
