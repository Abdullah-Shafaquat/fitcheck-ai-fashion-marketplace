"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import EmptyState from "@/Components/ui/EmptyState";
import { FiPackage, FiShoppingBag } from "react-icons/fi";
import { normalizeOrderStatus } from "@/lib/orderWorkflow";
interface OrderItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  date: string;
  items: OrderItem[];
  itemCount: number;
  total: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentStatus: string;
  transactionId: string | null;
}

const statusStyles: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-600",
  PENDING: "bg-amber-50 text-amber-600",
  FAILED: "bg-red-50 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-blue-50 text-blue-600",
};

function OrdersContent() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    setNeedsLogin(false);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        setNeedsLogin(true);
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span className="text-secondary font-medium">My Orders</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FiShoppingBag size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="editorial-title text-2xl sm:text-3xl text-[#1F1F1F]">My Orders</h1>
              <p className="text-sm text-gray-400">View your order history</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mb-8 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500 mb-3">
              Orders are connected to your account. Sign in to view your order history.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all sm:order-2"
              >
                Refresh Orders
              </button>
            </div>
          </form>

          {needsLogin && !loading && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiShoppingBag size={28} className="text-primary" />
              </div>
              <h2 className="text-lg font-bold text-[#1F1F1F] mb-1">Sign in to view your orders</h2>
              <p className="text-sm text-gray-400 mb-6">Your order history is linked to your account.</p>
              <Link href="/login" className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all">
                Sign In
              </Link>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && orders && !error && orders.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100">
              <EmptyState
                icon={<FiPackage size={28} />}
                title="No orders found"
                description="Orders for this email will appear here."
                actions={[{ label: "Start Shopping", href: "/shop" }]}
              />
            </div>
          )}

          {!loading && orders && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-bold text-[#1F1F1F] font-mono">{order.orderNo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyles[order.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        (() => {
                          const s = normalizeOrderStatus(order.status);
                          if (s === "Delivered") return "bg-emerald-50 text-emerald-600";
                          if (s === "Shipped" || s === "Out for Delivery") return "bg-blue-50 text-blue-600";
                          if (s === "Cancelled" || s === "Refunded") return "bg-red-50 text-red-600";
                          if (s === "Cancel Requested") return "bg-violet-50 text-violet-600";
                          if (s === "Processing" || s === "Packed" || s === "Pending" || s === "Confirmed") return "bg-amber-50 text-amber-600";
                          return "bg-gray-100 text-gray-500";
                        })()
                      }`}>
                        {normalizeOrderStatus(order.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 py-4">
                    {order.items?.slice(0, 3).map((it, i) => (
                      <div key={i} className="relative w-14 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={it.image || "/images/placeholder.jpg"}
                          alt={it.name || "item"}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                    <div className="flex-1 min-w-0 ml-2">
                      <p className="text-sm font-semibold text-[#1F1F1F]">
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {order.items?.map((it) => it.name).filter(Boolean).join(", ")}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Payment · {order.paymentProvider || "SAFEPAY"}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1F1F1F]">
                      Rs {order.total.toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex justify-end">
                    <Link
                      href={`/orders/${encodeURIComponent(order.orderNo)}`}
                      className="inline-flex items-center text-xs font-semibold text-primary hover:underline px-3 py-1.5"
                    >
                      View Order Details →
                    </Link>
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

export default function OrdersPage() {
  return <OrdersContent />;
}
