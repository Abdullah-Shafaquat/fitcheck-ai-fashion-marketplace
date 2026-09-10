"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiShield, FiSearch, FiClock } from "react-icons/fi";
import OrderReceipt from "@/Components/Receipt/OrderReceipt";
import OrderTrackingTimeline from "@/Components/orders/OrderTrackingTimeline";
import OrderItemsList from "@/Components/orders/OrderItemsList";
import OrderAddressDisplay from "@/Components/orders/OrderAddressDisplay";
import StatusHistoryList from "@/Components/orders/StatusHistoryList";
import CancelOrderModal from "@/Components/orders/CancelOrderModal";
import RefundOrderModal from "@/Components/orders/RefundOrderModal";
import {
  formatExpectedDelivery,
  canCustomerCancel,
  canRequestRefund,
  normalizeOrderStatus,
  StatusHistoryEntry,
} from "@/lib/orderWorkflow";

interface OrderItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
  image?: string;
  sku?: string | null;
}

interface Order {
  id?: string;
  orderNo: string;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  email?: string;
  customer?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  transactionId?: string | null;
  paymentReference?: string | null;
  paymentProvider?: string;
  createdAt?: string;
  updatedAt?: string;
  statusHistory?: StatusHistoryEntry[];
  addressSnapshot?: unknown;
  expectedDeliveryAt?: string | null;
  expectedDeliveryEndAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  shippingMethod?: string | null;
  lastStatusChangeAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancellationReasonDetails?: string | null;
  refundStatus?: string | null;
  refundReason?: string | null;
  refundReasonDetails?: string | null;
}

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; order: Order }
  | { kind: "denied"; message: string }
  | { kind: "error"; message: string };

function OrderDetailContent() {
  const params = useParams<{ orderNo: string }>();
  const searchParams = useSearchParams();
  const orderNo = String(params?.orderNo || "").split(/[?&#]/)[0].trim();

  const [emailInput, setEmailInput] = useState("");
  const [state, setState] = useState<DetailState>({ kind: "idle" });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(
    async (emailToUse: string) => {
      if (!orderNo) return setState({ kind: "error", message: "Order not found." });
      setState({ kind: "loading" });
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderNo)}?email=${encodeURIComponent(emailToUse)}`
        );
        const data = await res.json();
        if (res.status === 403) {
          return setState({
            kind: "denied",
            message: data.error || "This order is not associated with that email.",
          });
        }
        if (!res.ok || !data.order) {
          return setState({ kind: "error", message: data.error || "Order not found." });
        }
        setState({ kind: "ready", order: data.order as Order });
      } catch {
        setState({ kind: "error", message: "Could not load this order. Please try again." });
      }
    },
    [orderNo]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let storedEmail = "";
    try {
      const raw = localStorage.getItem("fitcheck-user");
      const u = raw ? (JSON.parse(raw) as { email?: string }) : null;
      storedEmail = u?.email || "";
    } catch {
      storedEmail = "";
    }
    const queryEmail = searchParams.get("email") || "";
    if (!emailInput && storedEmail) setEmailInput(storedEmail);
    const emailToUse = queryEmail || storedEmail;
    if (emailToUse && orderNo) load(emailToUse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    load(emailInput.trim());
  };

  const runAction = async (action: "cancel" | "refund-request", reason: string, details: string) => {
    if (state.kind !== "ready") return;
    const email = state.order.email || emailInput.trim();
    setActionBusy(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNo)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action, reason, reasonDetails: details }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setState({ kind: "ready", order: data.order });
    } finally {
      setActionBusy(false);
    }
  };

  const statusBadge = (st: string) => {
    const s = normalizeOrderStatus(st);
    if (s === "Delivered") return "bg-emerald-50 text-emerald-600";
    if (s === "Shipped" || s === "Out for Delivery") return "bg-blue-50 text-blue-600";
    if (s === "Cancelled" || s === "Refunded") return "bg-red-50 text-red-600";
    if (s === "Cancel Requested") return "bg-violet-50 text-violet-600";
    return "bg-amber-50 text-amber-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-primary">My Orders</Link>
            <span>/</span>
            <span className="text-secondary font-medium font-mono">{orderNo || "Order"}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {state.kind === "idle" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex items-center gap-2 text-emerald-600 mb-3">
              <FiShield size={18} />
              <h1 className="text-lg font-bold">Verify to view order</h1>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Confirm the email used to place this order.
            </p>
            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl flex-1 bg-gray-50">
                <FiSearch className="text-gray-400" size={16} />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter the order email"
                  required
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl">
                View Order
              </button>
            </form>
          </div>
        )}

        {state.kind === "loading" && (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {state.kind === "denied" && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <FiShield size={28} className="text-red-400 mx-auto mb-3" />
            <h1 className="text-lg font-bold mb-1">Order not accessible</h1>
            <p className="text-sm text-red-600 mb-5">{state.message}</p>
            <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 border border-red-200 rounded-xl text-sm"
              />
              <button type="submit" className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl">
                Retry
              </button>
            </form>
          </div>
        )}

        {state.kind === "error" && (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <h1 className="text-lg font-bold mb-2">Order not found</h1>
            <p className="text-sm text-gray-400 mb-6">{state.message}</p>
            <Link href="/shop" className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl">
              Continue Shopping
            </Link>
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <div className="print:hidden mb-6">
              <h1 className="editorial-title text-2xl sm:text-3xl text-[#1F1F1F]">Order {state.order.orderNo}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadge(state.order.status)}`}>
                  {normalizeOrderStatus(state.order.status)}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    state.order.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {state.order.paymentStatus}
                </span>
              </div>
              {state.order.expectedDeliveryAt && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-3">
                  <FiClock size={14} />
                  Expected delivery:{" "}
                  <strong>
                    {formatExpectedDelivery(
                      state.order.expectedDeliveryAt,
                      state.order.expectedDeliveryEndAt
                    )}
                  </strong>
                </p>
              )}
            </div>

            <div className="print:hidden space-y-6 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Tracking
                </h2>
                <OrderTrackingTimeline
                  status={state.order.status}
                  statusHistory={state.order.statusHistory}
                  createdAt={state.order.createdAt}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <OrderAddressDisplay
                  addressSnapshot={state.order.addressSnapshot}
                  fallback={{
                    customer: state.order.customer,
                    phone: state.order.phone,
                    address: state.order.address,
                    city: state.order.city,
                    zip: state.order.zip,
                    country: state.order.country,
                  }}
                />
                {state.order.trackingNumber && (
                  <div className="text-sm">
                    <p className="text-xs text-gray-400">Tracking Number</p>
                    <p className="font-mono font-semibold">{state.order.trackingNumber}</p>
                    {state.order.carrier && (
                      <p className="text-xs text-gray-400 mt-0.5">Carrier: {state.order.carrier}</p>
                    )}
                  </div>
                )}
                <OrderItemsList items={state.order.items} currency={state.order.currency} />
              </div>

              {(state.order.statusHistory?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Status History
                  </h2>
                  <StatusHistoryList history={state.order.statusHistory || []} />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {normalizeOrderStatus(state.order.status) === "Cancel Requested" && (
                  <div className="w-full flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-medium rounded-xl px-4 py-3">
                    <FiClock size={14} />
                    Your cancellation request is being reviewed. You&apos;ll be notified once it&apos;s approved or declined.
                  </div>
                )}
                {canCustomerCancel(state.order.status) && (
                  <button
                    onClick={() => setCancelOpen(true)}
                    disabled={actionBusy}
                    className="px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50"
                  >
                    Cancel Order
                  </button>
                )}
                {canRequestRefund(state.order.status) &&
                  state.order.refundStatus !== "REQUESTED" &&
                  state.order.refundStatus !== "REFUNDED" && (
                    <button
                      onClick={() => setRefundOpen(true)}
                      disabled={actionBusy}
                      className="px-5 py-2.5 border border-purple-200 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-50"
                    >
                      Request Refund
                    </button>
                  )}
              </div>
            </div>

            <OrderReceipt order={{ ...state.order, date: state.order.createdAt }} />

            <div className="print:hidden mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/track-order?orderNo=${encodeURIComponent(state.order.orderNo)}&email=${encodeURIComponent(
                  state.order.email || ""
                )}`}
                className="px-6 py-3 border-2 border-[#FF6B35] text-[#FF6B35] text-sm font-semibold rounded-xl text-center"
              >
                Track Your Order
              </Link>
              <Link
                href="/shop"
                className="px-6 py-3 border border-gray-200 text-sm font-semibold rounded-xl text-center"
              >
                Continue Shopping
              </Link>
            </div>

            <CancelOrderModal
              orderNo={state.order.orderNo}
              open={cancelOpen}
              variant="customer"
              onClose={() => setCancelOpen(false)}
              onConfirm={async (reason, details) => {
                await runAction("cancel", reason, details);
              }}
            />
            <RefundOrderModal
              orderNo={state.order.orderNo}
              open={refundOpen}
              onClose={() => setRefundOpen(false)}
              onConfirm={async (reason, details) => {
                await runAction("refund-request", reason, details);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OrderDetailContent />
    </Suspense>
  );
}
