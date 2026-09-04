"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FiSearch,
  FiPackage,
  FiArrowLeft,
  FiAlertCircle,
  FiClock,
  FiCreditCard,
} from "react-icons/fi";
import OrderTrackingTimeline from "@/Components/orders/OrderTrackingTimeline";
import OrderItemsList from "@/Components/orders/OrderItemsList";
import OrderAddressDisplay from "@/Components/orders/OrderAddressDisplay";
import { formatExpectedDelivery, StatusHistoryEntry } from "@/lib/orderWorkflow";

interface OrderData {
  orderNo: string;
  status: string;
  paymentStatus: string;
  paymentProvider?: string;
  createdAt: string;
  updatedAt?: string;
  email: string;
  customer: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  total: number;
  subtotal: number;
  shipping: number;
  currency: string;
  items: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    color?: string;
    size?: string;
    image?: string;
  }>;
  statusHistory?: StatusHistoryEntry[];
  addressSnapshot?: unknown;
  expectedDeliveryAt?: string | null;
  expectedDeliveryEndAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  shippingMethod?: string | null;
  lastStatusChangeAt?: string | null;
  cancellationReason?: string | null;
  cancellationReasonDetails?: string | null;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const prefillOrderNo = searchParams.get("orderNo") || "";
  const prefillEmail = searchParams.get("email") || "";

  const [orderNumber, setOrderNumber] = useState(prefillOrderNo);
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);

  const handleLookup = useCallback(
    async (oNo?: string, em?: string) => {
      const ordNo = (oNo ?? orderNumber).trim();
      const eml = (em ?? email).trim();
      if (!ordNo || !eml) {
        setError("Please enter both order number and email.");
        return;
      }
      setLoading(true);
      setError("");
      setOrder(null);
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(ordNo)}?email=${encodeURIComponent(eml)}`
        );
        if (res.status === 404) {
          setError("Order not found. Please check your order number and email.");
          return;
        }
        if (res.status === 403) {
          setError("Email does not match this order.");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "Something went wrong. Please try again.");
          return;
        }
        const body = await res.json();
        setOrder(body.order);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, email]
  );

  useEffect(() => {
    if (prefillOrderNo && prefillEmail) {
      handleLookup(prefillOrderNo, prefillEmail);
    }
  }, [prefillOrderNo, prefillEmail, handleLookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup();
  };

  const deliveryLabel = order
    ? formatExpectedDelivery(order.expectedDeliveryAt, order.expectedDeliveryEndAt)
    : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary mb-4">
            <FiArrowLeft size={14} />
            Home
          </Link>
          <p className="eyebrow-light mb-3">Order Tracking</p>
          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Track Order</h1>
          <p className="text-gray-500 mt-3 text-sm">Enter your order details to track your package</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 space-y-5 shadow-[var(--shadow-card)]">
            <div>
              <label htmlFor="track-order-number" className="text-xs font-medium text-gray-500 mb-1.5 block">Order Number</label>
              <input
                id="track-order-number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., FC-20260831-4821"
                required
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <div>
              <label htmlFor="track-order-email" className="text-xs font-medium text-gray-500 mb-1.5 block">Email Address</label>
              <input
                id="track-order-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiSearch size={16} />
              )}
              {loading ? "Tracking..." : "Track Order"}
            </button>
          </form>

          {error && (
            <div className="mt-6 flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-5">
              <FiAlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Order Not Found</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {order && (
            <div className="mt-8 space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <FiPackage size={22} className="text-[#FF6B35] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-lg font-bold text-secondary">Order {order.orderNo}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Placed{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {order.lastStatusChangeAt && (
                        <>
                          {" "}
                          · Last updated{" "}
                          {new Date(order.lastStatusChangeAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FF6B35]/10 text-[#FF6B35]">
                    {order.status}
                  </span>
                </div>

                {deliveryLabel && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-xl px-4 py-3 mb-6">
                    <FiClock size={16} className="text-blue-500" />
                    <span>
                      Expected delivery: <strong>{deliveryLabel}</strong>
                    </span>
                  </div>
                )}

                <OrderTrackingTimeline
                  status={order.status}
                  statusHistory={order.statusHistory}
                  createdAt={order.createdAt}
                />

                {order.cancellationReason && (
                  <div className="mt-6 p-4 bg-red-50 rounded-xl text-sm">
                    <p className="font-semibold text-red-700">Cancellation Reason</p>
                    <p className="text-red-600 mt-1">{order.cancellationReason}</p>
                    {order.cancellationReasonDetails && (
                      <p className="text-xs text-red-500 mt-1">{order.cancellationReasonDetails}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 space-y-5">
                <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">Order Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-medium">{order.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <FiCreditCard size={14} />
                      {order.paymentStatus}
                      {order.paymentProvider && (
                        <span className="text-gray-400 text-xs">({order.paymentProvider})</span>
                      )}
                    </p>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="text-sm">
                    <p className="text-xs text-gray-400">Tracking Number</p>
                    <p className="font-mono font-semibold">{order.trackingNumber}</p>
                    {order.carrier && (
                      <p className="text-xs text-gray-400 mt-0.5">Carrier: {order.carrier}</p>
                    )}
                  </div>
                )}

                <OrderAddressDisplay
                  addressSnapshot={order.addressSnapshot}
                  fallback={{
                    customer: order.customer,
                    phone: order.phone,
                    address: order.address,
                    city: order.city,
                    zip: order.zip,
                    country: order.country,
                  }}
                />

                <div>
                  <p className="text-xs text-gray-400 mb-3">Ordered Items</p>
                  <OrderItemsList items={order.items} currency={order.currency} />
                </div>

                <div className="border-t pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>PKR {order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span>{order.shipping === 0 ? "Free" : `PKR ${order.shipping.toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Order Total</span>
                    <span>PKR {order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/orders/${encodeURIComponent(order.orderNo)}?email=${encodeURIComponent(order.email)}`}
                  className="px-6 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] text-center"
                >
                  View Full Order Details
                </Link>
                <Link
                  href="/shop"
                  className="px-6 py-2.5 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 text-center"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <TrackOrderContent />
    </Suspense>
  );
}
