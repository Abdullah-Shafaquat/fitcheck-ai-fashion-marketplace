"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiDollarSign, FiCreditCard, FiAlertCircle } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
}

interface PayoutsData {
  payouts: Payout[];
  availableBalance: number;
  pendingBalance: number;
  totalPaidOut: number;
  minAmount: number;
}

const payoutStatusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-600";
    case "APPROVED":
      return "bg-blue-50 text-blue-600";
    case "PENDING":
    case "UNDER_REVIEW":
      return "bg-amber-50 text-amber-600";
    case "PROCESSING":
      return "bg-indigo-50 text-indigo-600";
    case "REJECTED":
    case "FAILED":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
};

function formatDate(iso: string): string {
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

export default function SellerPayoutsPage() {
  const router = useRouter();
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch("/api/seller/payouts");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setFetchError("Failed to load your payouts. Please try again.");
      }
    } catch {
      setFetchError("Failed to load your payouts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numAmount = Number(amount);
    if (data && numAmount < data.minAmount) {
      setError(`Minimum payout amount is Rs ${data.minAmount.toLocaleString()}`);
      return;
    }
    if (numAmount > (data?.availableBalance || 0)) {
      setError("Amount exceeds available balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          method,
          accountDetails: { accountTitle, accountNumber, bankName },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to request payout");
        return;
      }
      setSuccess("Payout request submitted successfully");
      setAmount("");
      setAccountTitle("");
      setAccountNumber("");
      setBankName("");
      fetchData();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

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

  const inputClass =
    "w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all";

  return (
    <PageTransition className="h-full">
      <div className="space-y-6 max-w-3xl">
        {fetchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{fetchError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#FF6B35] opacity-[0.07] blur-2xl" />
            <div className="relative">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Available
              </p>
              <p className="text-2xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
                Rs {(data?.availableBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500 opacity-[0.07] blur-2xl" />
            <div className="relative">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Pending
              </p>
              <p className="text-2xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
                Rs {(data?.pendingBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500 opacity-[0.07] blur-2xl" />
            <div className="relative">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Total Paid Out
              </p>
              <p className="text-2xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
                Rs {(data?.totalPaidOut || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
              <FiCreditCard size={18} className="text-[#FF6B35]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1F1F1F]">
                Request Payout
              </h2>
              <p className="text-[11px] text-gray-400">
                Min amount: Rs {(data?.minAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3 mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Amount (Rs)
              </label>
              <div className="relative">
                <FiDollarSign
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min={data?.minAmount || 0}
                  className={`${inputClass} pl-9`}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputClass}
              >
                <option value="bank">Bank Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Account Title
              </label>
              <input
                type="text"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                required
                className={inputClass}
                placeholder="Account holder name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className={inputClass}
                placeholder="Account or phone number"
              />
            </div>

            {method === "bank" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                  placeholder="Bank name"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Request Payout"
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-[#1F1F1F]">
              Payout History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.payouts || []).map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                      Rs {p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 capitalize">
                      {p.method}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${payoutStatusBadge(p.status)}`}
                      >
                        {p.status}
                      </span>
                      {p.rejectionReason && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {p.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {formatDate(p.requestedAt)}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {p.paidAt ? formatDate(p.paidAt) : "—"}
                    </td>
                  </tr>
                ))}
                {(!data?.payouts || data.payouts.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-400 text-sm"
                    >
                      No payout history
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
