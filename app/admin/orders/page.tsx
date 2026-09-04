"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiEye,
  FiCheck,
  FiX,
  FiTruck,
  FiPackage,
  FiRefreshCw,
  FiAlertTriangle,
  FiDatabase,
  FiClock,
} from "react-icons/fi";
import { useModal } from "@/lib/hooks/useModal";
import PageTransition from "@/Components/admin/PageTransition";
import OrderAddressDisplay from "@/Components/orders/OrderAddressDisplay";
import OrderItemsList from "@/Components/orders/OrderItemsList";
import StatusHistoryList from "@/Components/orders/StatusHistoryList";
import CancelOrderModal from "@/Components/orders/CancelOrderModal";
import RefundOrderModal from "@/Components/orders/RefundOrderModal";
import {
  validNextStatuses,
  statusActionLabel,
  formatExpectedDelivery,
  normalizeOrderStatus,
  StatusHistoryEntry,
} from "@/lib/orderWorkflow";

interface OrderItem {
  name?: string;
  quantity?: number;
  size?: string;
  color?: string;
  price?: number;
  image?: string;
}

interface Order {
  id: string;
  orderNo: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentStatus: string;
  transactionId: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  date: string;
  statusHistory?: StatusHistoryEntry[];
  addressSnapshot?: unknown;
  expectedDeliveryAt?: string | null;
  expectedDeliveryEndAt?: string | null;
  trackingNumber?: string | null;
  lastStatusChangeAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationReasonDetails?: string | null;
  refundStatus?: string | null;
  refundReason?: string | null;
  refundReasonDetails?: string | null;
  refundRequestedAt?: string | null;
  refundApprovedAt?: string | null;
  refundedAt?: string | null;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

function statusBadgeClass(status: string) {
  const s = normalizeOrderStatus(status);
  if (s === "Delivered") return "bg-emerald-50 text-emerald-600";
  if (s === "Shipped" || s === "Out for Delivery") return "bg-blue-50 text-blue-600";
  if (s === "Cancelled" || s === "Refunded") return "bg-red-50 text-red-600";
  if (s === "Cancel Requested") return "bg-violet-50 text-violet-600";
  if (s.startsWith("Refund")) return "bg-purple-50 text-purple-600";
  return "bg-amber-50 text-amber-600";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMode, setRefundMode] = useState<"request" | "complete">("request");
  const [trackingInput, setTrackingInput] = useState("");

  useModal(!!selectedOrder, () => {
    setSelectedOrder(null);
    setCancelOpen(false);
    setRefundOpen(false);
  });

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setPagination(data.pagination);
    } catch {
      setNotice({ type: "error", text: "Could not load orders from the database." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => fetchOrders(true), 45000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (selectedOrder) {
      setTrackingInput(selectedOrder.trackingNumber || "");
    }
  }, [selectedOrder]);

  const patchOrder = async (orderId: string, body: Record<string, unknown>) => {
    setSavingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setNotice({ type: "success", text: "Order updated successfully." });
      await fetchOrders(true);
      if (data.order) {
        setSelectedOrder({ ...data.order, date: data.order.createdAt });
      }
      return data;
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Could not update order.",
      });
      throw err;
    } finally {
      setSavingId(null);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string, extra?: Record<string, unknown>) => {
    await patchOrder(orderId, { status: newStatus, ...extra });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Loading live orders...</p>
        </div>
      </div>
    );
  }

  const nextActions = selectedOrder
    ? validNextStatuses(selectedOrder.status).filter((s) => s !== "Cancelled")
    : [];

  const canCancel = selectedOrder
    ? validNextStatuses(selectedOrder.status).includes("Cancelled")
    : false;

  const norm = selectedOrder ? normalizeOrderStatus(selectedOrder.status) : "";
  const showCancelRequest = norm === "Cancel Requested";
  const showRefundApprove = norm === "Refund Requested";
  const showRefundComplete = norm === "Refund Approved";
  const showRefundRequest =
    norm === "Delivered" || (selectedOrder?.refundStatus === "REJECTED" && norm === "Refund Rejected");

  return (
    <PageTransition className="h-full">
      <div className="space-y-6">
        {notice && (
          <div
            className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            {notice.type === "success" ? <FiCheck size={15} /> : <FiAlertTriangle size={15} />}
            <p className="text-xs font-semibold">{notice.text}</p>
            <button onClick={() => setNotice(null)} className="ml-auto opacity-60 hover:opacity-100">
              <FiX size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Orders", value: stats.totalOrders, color: "bg-blue-500" },
            { label: "Total Revenue", value: `Rs ${stats.totalRevenue.toLocaleString()}`, color: "bg-emerald-500" },
            { label: "In Progress", value: stats.pendingOrders, color: "bg-amber-500" },
            { label: "Delivered", value: stats.deliveredOrders, color: "bg-[#FF6B35]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${s.color} rounded-xl`} />
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{s.label}</p>
                  <p className="text-2xl font-black text-[#1F1F1F] tabular-nums">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl flex-1">
            <FiSearch className="text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by order no, customer, email or city..."
              className="flex-1 outline-none text-sm text-[#1F1F1F]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
          >
            {[
              "All",
              "Pending",
              "Confirmed",
              "Processing",
              "Packed",
              "Shipped",
              "Out for Delivery",
              "Delivered",
              "Cancel Requested",
              "Cancelled",
              "Refund Requested",
              "Refunded",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => fetchOrders(true)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white flex items-center gap-2 justify-center"
          >
            <FiRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400">
          <FiDatabase size={12} className="text-emerald-500" />
          Live from database · {pagination.total} orders
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Order", "Customer", "Items", "Total", "Payment", "Status", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50/80 hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold">{order.orderNo}</td>
                    <td className="px-6 py-3.5">
                      <p className="font-medium">{order.customer}</p>
                      <p className="text-[10px] text-gray-400">{order.email}</p>
                    </td>
                    <td className="px-6 py-3.5">{order.itemCount}</td>
                    <td className="px-6 py-3.5 font-bold">Rs {order.total.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50">
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(order.status)}`}>
                        {normalizeOrderStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400">{formatDate(order.date)}</td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg"
                      >
                        <FiEye size={14} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No orders found</div>
          )}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 font-semibold">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold">Order {selectedOrder.orderNo}</h3>
                  <p className="text-[11px] text-gray-400">
                    Placed {formatDate(selectedOrder.date)}
                    {selectedOrder.lastStatusChangeAt && (
                      <> · Updated {formatDate(selectedOrder.lastStatusChangeAt)}</>
                    )}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(selectedOrder.status)}`}>
                    {normalizeOrderStatus(selectedOrder.status)}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">
                    {selectedOrder.paymentStatus}
                  </span>
                  {selectedOrder.refundStatus && selectedOrder.refundStatus !== "NONE" && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                      Refund: {selectedOrder.refundStatus}
                    </span>
                  )}
                </div>

                {selectedOrder.expectedDeliveryAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50/50 rounded-xl px-4 py-3">
                    <FiClock size={16} className="text-blue-500" />
                    <span>
                      Expected delivery:{" "}
                      <strong>
                        {formatExpectedDelivery(
                          selectedOrder.expectedDeliveryAt,
                          selectedOrder.expectedDeliveryEndAt
                        )}
                      </strong>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Customer</p>
                    <p className="font-medium">{selectedOrder.customer}</p>
                    <p className="text-xs text-gray-400">{selectedOrder.email}</p>
                    <p className="text-xs text-gray-400">{selectedOrder.phone}</p>
                  </div>
                  <OrderAddressDisplay
                    addressSnapshot={selectedOrder.addressSnapshot}
                    fallback={{
                      customer: selectedOrder.customer,
                      phone: selectedOrder.phone,
                      address: selectedOrder.address,
                      city: selectedOrder.city,
                      zip: selectedOrder.zip,
                      country: selectedOrder.country,
                    }}
                  />
                </div>

                {selectedOrder.trackingNumber && (
                  <div className="text-sm">
                    <p className="text-gray-400 text-xs">Tracking Number</p>
                    <p className="font-mono font-semibold">{selectedOrder.trackingNumber}</p>
                  </div>
                )}

                {(norm === "Shipped" || norm === "Out for Delivery") && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tracking Number (optional)</label>
                    <input
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <p className="text-gray-400 text-xs mb-2">Items ({selectedOrder.itemCount})</p>
                  <OrderItemsList items={selectedOrder.items} currency={selectedOrder.currency} />
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>Rs {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span>{selectedOrder.shipping === 0 ? "Free" : `Rs ${selectedOrder.shipping.toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1">
                    <span>Total</span>
                    <span>Rs {selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>

                {selectedOrder.cancellationReason && (
                  <div className="rounded-xl bg-red-50 p-4 text-sm">
                    <p className="text-xs font-bold text-red-600 uppercase">Cancellation</p>
                    <p className="mt-1">{selectedOrder.cancellationReason}</p>
                    {selectedOrder.cancellationReasonDetails && (
                      <p className="text-xs text-red-500 mt-1">{selectedOrder.cancellationReasonDetails}</p>
                    )}
                    {selectedOrder.cancelledAt && (
                      <p className="text-[10px] text-red-400 mt-1">
                        {formatDate(selectedOrder.cancelledAt)} by {selectedOrder.cancelledBy}
                      </p>
                    )}
                  </div>
                )}

                {(selectedOrder.refundReason || selectedOrder.refundStatus) && (
                  <div className="rounded-xl bg-purple-50 p-4 text-sm">
                    <p className="text-xs font-bold text-purple-600 uppercase">Refund Details</p>
                    {selectedOrder.refundReason && <p className="mt-1">{selectedOrder.refundReason}</p>}
                    {selectedOrder.refundReasonDetails && (
                      <p className="text-xs text-purple-500 mt-1">{selectedOrder.refundReasonDetails}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-gray-400 text-xs mb-2">Status History</p>
                  <StatusHistoryList history={selectedOrder.statusHistory || []} />
                </div>

                <div className="rounded-xl bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase">Payment Actions</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => patchOrder(selectedOrder.id, { paymentAction: "paid" })}
                      disabled={savingId === selectedOrder.id || selectedOrder.paymentStatus === "PAID"}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 disabled:opacity-40"
                    >
                      Mark as Paid
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-xs mb-2">Next Actions</p>
                  <div className="flex gap-2 flex-wrap">
                    {nextActions.map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          updateStatus(selectedOrder.id, status, {
                            trackingNumber: trackingInput || undefined,
                          })
                        }
                        disabled={savingId === selectedOrder.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 disabled:opacity-40"
                      >
                        {status === "Shipped" || status === "Out for Delivery" ? (
                          <FiTruck size={12} />
                        ) : status === "Delivered" ? (
                          <FiCheck size={12} />
                        ) : (
                          <FiPackage size={12} />
                        )}
                        {statusActionLabel(status)}
                      </button>
                    ))}
                    {canCancel && (
                      <button
                        onClick={() => setCancelOpen(true)}
                        disabled={savingId === selectedOrder.id}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600"
                      >
                        Cancel Order
                      </button>
                    )}
                    {showCancelRequest && (
                      <>
                        <button
                          onClick={() => patchOrder(selectedOrder.id, { cancellationAction: "approve" })}
                          disabled={savingId === selectedOrder.id}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600"
                        >
                          Approve Cancellation
                        </button>
                        <button
                          onClick={() => patchOrder(selectedOrder.id, { cancellationAction: "reject" })}
                          disabled={savingId === selectedOrder.id}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600"
                        >
                          Reject Cancellation
                        </button>
                      </>
                    )}
                    {showRefundRequest && (
                      <button
                        onClick={() => {
                          setRefundMode("request");
                          setRefundOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 text-purple-600"
                      >
                        Initiate Refund
                      </button>
                    )}
                    {showRefundApprove && (
                      <>
                        <button
                          onClick={() => patchOrder(selectedOrder.id, { refundAction: "approve" })}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600"
                        >
                          Approve Refund
                        </button>
                        <button
                          onClick={() => patchOrder(selectedOrder.id, { refundAction: "reject" })}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600"
                        >
                          Reject Refund
                        </button>
                      </>
                    )}
                    {showRefundComplete && (
                      <button
                        onClick={() => {
                          setRefundMode("complete");
                          setRefundOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600"
                      >
                        Complete Refund (Payment Reversed)
                      </button>
                    )}
                  </div>
                  {nextActions.length === 0 && !canCancel && !showCancelRequest && !showRefundApprove && !showRefundComplete && !showRefundRequest && (
                    <p className="text-xs text-gray-400">No further actions available for this order.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedOrder && (
          <>
            <CancelOrderModal
              orderNo={selectedOrder.orderNo}
              open={cancelOpen}
              onClose={() => setCancelOpen(false)}
              onConfirm={async (reason, details) => {
                await patchOrder(selectedOrder.id, {
                  status: "Cancelled",
                  cancellationReason: reason,
                  cancellationReasonDetails: details || undefined,
                });
              }}
            />
            <RefundOrderModal
              orderNo={selectedOrder.orderNo}
              open={refundOpen}
              onClose={() => setRefundOpen(false)}
              title={refundMode === "complete" ? "Complete Refund" : "Initiate Refund"}
              onConfirm={async (reason, details) => {
                if (refundMode === "complete") {
                  await patchOrder(selectedOrder.id, {
                    refundAction: "complete",
                    refundReason: reason,
                    refundReasonDetails: details || undefined,
                  });
                } else {
                  await patchOrder(selectedOrder.id, {
                    refundAction: "request",
                    refundReason: reason,
                    refundReasonDetails: details || undefined,
                  });
                }
              }}
            />
          </>
        )}
      </div>
    </PageTransition>
  );
}
