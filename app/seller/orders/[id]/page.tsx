"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiAlertCircle } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image?: string;
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
  phone?: string;
  total: number;
  items: OrderItem[];
  addressSnapshot?: {
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
}

const FULFILLMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
];

const fulfillmentBadge = (status: string) => {
  switch (status) {
    case "SHIPPED":
      return "bg-blue-50 text-blue-600";
    case "READY_TO_SHIP":
      return "bg-indigo-50 text-indigo-600";
    case "PROCESSING":
      return "bg-amber-50 text-amber-600";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-600";
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SellerOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/seller/orders/${id}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setSelectedStatus(data.order.orderStatus);
      } else {
        setError("Failed to load your order. Please try again.");
      }
    } catch {
      setError("Failed to load your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async () => {
    if (!order || selectedStatus === order.orderStatus) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/seller/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (res.ok) {
        fetchOrder();
      }
    } catch {
      // ignore
    } finally {
      setUpdating(false);
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

  if (!order) {
    if (error) {
      return (
        <PageTransition className="h-full">
          <div className="space-y-6 max-w-3xl">
            <Link
              href="/seller/orders"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF6B35] transition-colors"
            >
              <FiArrowLeft size={14} />
              Back to Orders
            </Link>
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
              <FiAlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </PageTransition>
      );
    }
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Order not found</p>
      </div>
    );
  }

  return (
    <PageTransition className="h-full">
      <div className="space-y-6 max-w-3xl">
        <Link
          href="/seller/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF6B35] transition-colors"
        >
          <FiArrowLeft size={14} />
          Back to Orders
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1F1F1F] font-mono">
                {order.orderNo}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-600">
              {order.paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Customer
              </h3>
              <p className="text-sm font-semibold text-[#1F1F1F]">
                {order.customer}
              </p>
              <p className="text-sm text-gray-500">{order.email}</p>
              {order.phone && (
                <p className="text-sm text-gray-500">{order.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Address
              </h3>
              {order.addressSnapshot ? (
                <div className="text-sm text-gray-600">
                  {order.addressSnapshot.address && (
                    <p>{order.addressSnapshot.address}</p>
                  )}
                  <p>
                    {[order.addressSnapshot.city, order.addressSnapshot.province]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.addressSnapshot.country && (
                    <p>{order.addressSnapshot.country}</p>
                  )}
                  {order.addressSnapshot.zip && (
                    <p>{order.addressSnapshot.zip}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No address</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-[#1F1F1F]">Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Fulfillment
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50/80 last:border-0"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-[#1F1F1F]">
                            {item.name}
                          </p>
                          {(item.size || item.color) && (
                            <p className="text-[11px] text-gray-400">
                              {[item.size, item.color]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 tabular-nums text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-[#1F1F1F] tabular-nums">
                      Rs {item.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${fulfillmentBadge(item.fulfillmentStatus)}`}
                      >
                        {item.fulfillmentStatus?.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100">
                  <td
                    colSpan={3}
                    className="px-6 py-3 text-right text-sm font-bold text-[#1F1F1F]"
                  >
                    Total
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-[#1F1F1F] tabular-nums">
                    Rs {order.total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-[#1F1F1F] mb-4">
            Update Fulfillment Status
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all flex-1"
            >
              {FULFILLMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={
                updating || selectedStatus === order.orderStatus
              }
              className="h-11 px-6 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Update"
              )}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
