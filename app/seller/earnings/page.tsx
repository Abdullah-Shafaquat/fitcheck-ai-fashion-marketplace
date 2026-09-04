"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiDollarSign, FiClock, FiArrowRight, FiAlertCircle } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Statement {
  id: string;
  kind: string;
  orderNo: string;
  productName: string;
  gross: number;
  commission: number;
  commissionRate: number;
  net: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}

interface EarningsData {
  balances: {
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalPaidOut: number;
  };
  statements: Statement[];
  stats: Record<string, unknown>;
}

const kindBadge = (kind: string) => {
  switch (kind) {
    case "SALE":
      return "bg-emerald-50 text-emerald-600";
    case "REFUND":
      return "bg-red-50 text-red-600";
    case "COMMISSION":
      return "bg-amber-50 text-amber-600";
    case "PAYOUT":
      return "bg-blue-50 text-blue-600";
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

export default function SellerEarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/seller/earnings");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Failed to load your earnings. Please try again.");
      }
    } catch {
      setError("Failed to load your earnings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const balances = data?.balances;

  const balanceCards = [
    {
      label: "Available",
      value: balances?.availableBalance || 0,
      icon: FiDollarSign,
      gradient: "bg-[#FF6B35]",
    },
    {
      label: "Pending (14-day hold)",
      value: balances?.pendingBalance || 0,
      icon: FiClock,
      gradient: "bg-amber-500",
    },
    {
      label: "Total Earnings",
      value: balances?.totalEarnings || 0,
      icon: FiDollarSign,
      gradient: "bg-emerald-500",
    },
    {
      label: "Total Paid Out",
      value: balances?.totalPaidOut || 0,
      icon: FiDollarSign,
      gradient: "bg-blue-500",
    },
  ];

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balanceCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${card.gradient} opacity-[0.07] blur-2xl`}
                />
                <div className="relative">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-2xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
                    Rs {card.value.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 text-sm text-amber-700">
          <strong>Note:</strong> Earnings are held for 14 days after delivery
          before becoming available for payout.{" "}
          <Link
            href="/seller/payouts"
            className="inline-flex items-center gap-1 font-semibold text-[#FF6B35] hover:underline ml-1"
          >
            Request Payout <FiArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-[#1F1F1F]">
              Earnings Ledger
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.statements || []).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${kindBadge(s.kind)}`}
                      >
                        {s.kind}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-[#1F1F1F] font-medium">
                        {s.productName || s.note || s.orderNo || "—"}
                      </p>
                      {s.orderNo && s.productName && (
                        <p className="text-[11px] text-gray-400">
                          {s.orderNo}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 tabular-nums text-gray-600">
                      Rs {s.gross.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 tabular-nums text-red-500">
                      -Rs {s.commission.toLocaleString()} ({s.commissionRate}%)
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                      Rs {s.net.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
                {(!data?.statements || data.statements.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-400 text-sm"
                    >
                      No earnings data yet
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
