"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiAlertCircle } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  fulfillmentStatus: string;
}

interface Order {
  orderId: string;
  orderNo: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  customer: string;
  email: string;
  total: number;
  items: OrderItem[];
}

const STATUS_FILTERS = [
  "All",
  "PENDING",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const orderStatusBadge = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-600";
    case "SHIPPED":
      return "bg-blue-50 text-blue-600";
    case "PROCESSING":
    case "READY_TO_SHIP":
      return "bg-amber-50 text-amber-600";
    case "PENDING":
      return "bg-orange-50 text-orange-600";
    case "CANCELLED":
    case "REFUNDED":
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

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "All") params.set("status", status);
      const res = await fetch(
        `/api/seller/orders${params.toString() ? `?${params.toString()}` : ""}`
      );
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setError("Failed to load your orders. Please try again.");
      }
    } catch {
      setError("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter, fetchOrders]);

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                statusFilter === s
                  ? "bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "All" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-sm font-semibold text-gray-500">
              No orders found
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.orderId}
                      className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-semibold text-[#1F1F1F] font-mono text-xs">
                        {o.orderNo}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">
                        {o.customer}
                      </td>
                      <td className="px-6 py-3.5 text-gray-400 text-xs">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 tabular-nums">
                        {o.items?.length || 0}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                        Rs {o.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${orderStatusBadge(o.orderStatus)}`}
                        >
                          {o.orderStatus?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/seller/orders/${o.orderId}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all"
                        >
                          <FiEye size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
