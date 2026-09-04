"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiShield,
  FiShieldOff,
  FiEdit2,
  FiUserCheck,
  FiUserX,
  FiPauseCircle,
  FiTrash2,
  FiKey,
  FiEyeOff,
  FiRefreshCw,
  FiMapPin,
  FiPackage,
  FiAlertTriangle,
} from "react-icons/fi";

const BLOCK_REASONS = [
  "Suspicious activity",
  "Fraud concern",
  "Repeated policy violation",
  "Abusive behavior",
  "Chargeback issue",
  "Duplicate/fake account",
  "Other",
];

interface OrderLite {
  id: string;
  orderNo: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  expectedDeliveryAt: string | null;
  itemCount: number;
}

interface Address {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  label: string;
  line1: string;
  line2?: string | null;
  area?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  adminId: string | null;
  details: string | null;
  createdAt: string;
}

interface CustomerDetail {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  provider: string | null;
  accountStatus: string;
  adminNotes: string | null;
  forcePasswordReset: boolean;
  blockedAt: string | null;
  blockedBy: string | null;
  blockReason: string | null;
  blockReasonDetails: string | null;
  isBlockedEmail: boolean;
  hasAccount: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  deletedAt: string | null;
  orders: OrderLite[];
  addresses: Address[];
  stats: { orders: number; totalSpent: number };
  auditLogs: AuditLog[];
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-600",
  INACTIVE: "bg-amber-50 text-amber-600",
  SUSPENDED: "bg-orange-50 text-orange-600",
  BLOCKED: "bg-red-50 text-red-600",
  DELETED: "bg-gray-100 text-gray-500",
  GUEST: "bg-blue-50 text-blue-600",
};

const auditLabels: Record<string, string> = {
  CUSTOMER_UPDATED: "Profile updated",
  CUSTOMER_ACTIVATED: "Account activated",
  CUSTOMER_DEACTIVATED: "Account deactivated",
  CUSTOMER_SUSPENDED: "Account suspended",
  CUSTOMER_BLOCKED: "Account blocked",
  CUSTOMER_UNBLOCKED: "Account unblocked",
  CUSTOMER_DELETED: "Account deleted",
  PASSWORD_RESET_INITIATED: "Password reset initiated",
  FORCE_PASSWORD_RESET: "Force password reset",
  BLOCKED_EMAIL_ADDED: "Email added to blocklist",
  BLOCKED_EMAIL_REMOVED: "Email removed from blocklist",
};

type ModalState =
  | { kind: "none" }
  | { kind: "block"; reason: string; details: string }
  | { kind: "confirm"; action: string }
  | { kind: "reset-link"; resetLink: string; expiresAt: string }
  | { kind: "delete" };

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customer");
      setCustomer(data.customer);
      setNotes(data.customer.adminNotes || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (type: "ok" | "err", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const runAction = async (action: string, extra?: Record<string, string>) => {
    setBusy(true);
    setModal({ kind: "none" });
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Action failed");
        return;
      }
      if (customer) setCustomer(data.customer);
      if (data.resetLink) {
        setModal({ kind: "reset-link", resetLink: data.resetLink, expiresAt: data.expiresAt });
      }
      flash("ok", data.message || "Action completed successfully");
    } catch {
      flash("err", "Network error — action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleEditSave = async () => {
    if (!customer) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Update failed");
        return;
      }
      setCustomer(data.customer);
      setEditOpen(false);
      flash("ok", "Customer updated");
    } catch {
      flash("err", "Network error — update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleNotesSave = async () => {
    if (!customer) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Could not save notes");
        return;
      }
      setCustomer(data.customer);
      flash("ok", "Admin notes saved");
    } catch {
      flash("err", "Network error — could not save notes");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    if (!customer) return;
    setEditForm({ name: customer.name, email: customer.email, phone: customer.phone || "" });
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <FiAlertTriangle size={36} className="text-red-400" />
        <p className="text-sm text-gray-500">{error || "Customer not found"}</p>
        <Link href="/admin/customers" className="px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-colors">
          Back to Customers
        </Link>
      </div>
    );
  }

  const initials = customer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const displayStatus = customer.isBlockedEmail ? "BLOCKED" : customer.accountStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <Link href="/admin/customers" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-[#FF6B35] transition-colors mb-2">
            <FiArrowLeft size={14} /> Back to Customers
          </Link>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">Customer Details</h1>
        </div>
        <span className={`inline-flex self-start text-xs font-bold px-3 py-1.5 rounded-full capitalize ${statusStyles[displayStatus] || "bg-gray-100 text-gray-500"}`}>
          {customer.isBlockedEmail ? "Blocked" : displayStatus.toLowerCase()}
        </span>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: profile + actions */}
        <div className="space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              {customer.image ? (
                <img src={customer.image} alt={customer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </div>
            <h2 className="text-lg font-bold text-[#1F1F1F]">{customer.name}</h2>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <FiMail size={11} /> {customer.email}
            </p>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <FiPhone size={11} /> {customer.phone || "No phone"}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-[11px] font-semibold capitalize">
              {customer.provider || "Guest"} account
            </div>

            <div className="mt-4 space-y-2 text-left text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <FiCalendar size={12} className="text-gray-300" />
                <span>Joined: {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiClock size={12} className="text-gray-300" />
                <span>Last login: {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString("en-GB") : "—"}</span>
              </div>
            </div>

            {customer.hasAccount ? (
              <button onClick={() => { setEditOpen(false); openEdit(); }} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-sm font-semibold text-[#1F1F1F] rounded-xl hover:bg-gray-50 transition-colors">
                <FiEdit2 size={15} /> Edit Profile
              </button>
            ) : (
              <p className="mt-4 text-[11px] text-gray-400 bg-gray-50 rounded-xl p-3">
                This is a guest (order-only) customer. To control access, block the email instead.
              </p>
            )}
          </div>

          {/* Block info */}
          {customer.isBlockedEmail && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <FiShieldOff size={16} />
                <p className="text-sm font-bold">Blocked</p>
              </div>
              <div className="space-y-1 text-xs text-red-600">
                {customer.blockReason && <p>Reason: <span className="font-semibold">{customer.blockReason}</span></p>}
                {customer.blockReasonDetails && <p className="text-red-500">{customer.blockReasonDetails}</p>}
                {customer.blockedAt && <p>Blocked: {new Date(customer.blockedAt).toLocaleString("en-GB")}</p>}
                {customer.blockedBy && <p>By: {customer.blockedBy}</p>}
              </div>
            </div>
          )}

          {customer.forcePasswordReset && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <FiKey size={15} />
                <p className="text-sm font-bold">Password reset required</p>
              </div>
              <p className="text-xs text-amber-600">This customer must create a new password on their next sign-in.</p>
            </div>
          )}
        </div>

        {/* RIGHT: management + data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account actions */}
          {customer.hasAccount && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-base font-bold text-[#1F1F1F] mb-1">Account Control</h3>
              <p className="text-xs text-gray-400 mb-4">Each action is logged and confirmed separately.</p>
              <div className="flex flex-wrap gap-2">
                {customer.accountStatus !== "ACTIVE" && (
                  <button onClick={() => setModal({ kind: "confirm", action: "activate" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <FiUserCheck size={14} /> Activate
                  </button>
                )}
                {customer.accountStatus === "ACTIVE" && (
                  <button onClick={() => setModal({ kind: "confirm", action: "deactivate" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50">
                    <FiUserX size={14} /> Deactivate
                  </button>
                )}
                {customer.accountStatus !== "SUSPENDED" && (
                  <button onClick={() => setModal({ kind: "confirm", action: "suspend" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors disabled:opacity-50">
                    <FiPauseCircle size={14} /> Suspend
                  </button>
                )}
                {!customer.isBlockedEmail && (
                  <button onClick={() => setModal({ kind: "block", reason: "", details: "" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                    <FiShieldOff size={14} /> Block
                  </button>
                )}
                {customer.isBlockedEmail && (
                  <button onClick={() => setModal({ kind: "confirm", action: "unblock" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <FiShield size={14} /> Unblock
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Security</h4>
                <div className="flex flex-wrap gap-2">
                  {customer.accountStatus !== "DELETED" && (
                    <button onClick={() => runAction("send-password-reset")} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50">
                      <FiKey size={14} /> Send Password Reset
                    </button>
                  )}
                  {customer.accountStatus !== "DELETED" && !customer.forcePasswordReset && (
                    <button onClick={() => setModal({ kind: "confirm", action: "force-password-reset" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50">
                      <FiRefreshCw size={14} /> Force Password Reset
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5">
                  <FiEyeOff size={12} /> Customer passwords are never displayed. Only secure reset links are used.
                </p>
              </div>

              {customer.accountStatus !== "DELETED" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => setModal({ kind: "delete" })} disabled={busy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                    <FiTrash2 size={14} /> Soft Delete Account
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">Orders, payments and history are preserved; the account is hidden and can no longer sign in.</p>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Orders", value: String(customer.stats.orders) },
              { label: "Total Spent", value: `Rs ${customer.stats.totalSpent.toLocaleString()}` },
              { label: "Saved Addresses", value: String(customer.addresses.length) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-lg font-black text-[#1F1F1F]">{s.value}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Edit profile */}
          {editOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Edit Customer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleEditSave} disabled={busy} className="px-5 py-2 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-colors disabled:opacity-50">
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] mb-1">Admin Notes</h3>
            <p className="text-xs text-gray-400 mb-3">Private notes visible only to authorized admins.</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g., Customer contacted support regarding delayed shipment."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 resize-none"
            />
            <div className="mt-2 flex justify-end">
              <button onClick={handleNotesSave} disabled={busy} className="px-5 py-2 bg-[#1F1F1F] text-white text-sm font-semibold rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50">
                {busy ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2">
                <FiPackage size={16} /> Orders
              </h3>
              <span className="text-xs text-gray-400">{customer.orders.length}</span>
            </div>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Order", "Date", "Items", "Total", "Order Status", "Payment"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/orders`} className="font-semibold text-[#FF6B35] hover:underline">{o.orderNo}</Link>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-3 py-2.5 text-gray-600">{o.itemCount}</td>
                        <td className="px-3 py-2.5 font-bold text-[#1F1F1F]">Rs {o.total.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 capitalize">{o.status}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${o.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-600" : o.paymentStatus === "REFUNDED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] flex items-center gap-2 mb-4">
              <FiMapPin size={16} /> Saved Addresses
            </h3>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No saved addresses</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customer.addresses.map((a) => (
                  <div key={a.id} className="rounded-xl border border-gray-100 p-4 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#1F1F1F] capitalize">{a.label}</p>
                      {a.isDefault && <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <p className="text-gray-600 text-xs">{a.fullName} · {a.phone}</p>
                    <p className="text-gray-500 text-xs mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                    <p className="text-gray-500 text-xs">{[a.area, a.city, a.province, a.postalCode].filter(Boolean).join(", ")}</p>
                    <p className="text-gray-400 text-xs">{a.country}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit log */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Audit History</h3>
            {customer.auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No audit records yet</p>
            ) : (
              <div className="space-y-3">
                {customer.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <FiClock size={13} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1F1F1F]">{auditLabels[log.action] || log.action}</p>
                      {log.details && <p className="text-xs text-gray-400 mt-0.5 break-words">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0">{new Date(log.createdAt).toLocaleString("en-GB")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {modal.kind === "confirm" && (
        <ModalShell title="Confirm Action" onClose={() => setModal({ kind: "none" })}>
          <p className="text-sm text-gray-600 mb-1">Are you sure you want to <span className="font-bold capitalize">{modal.action.replaceAll("-", " ")}</span> this customer?</p>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 mt-3">
            <p className="font-semibold text-[#1F1F1F]">{customer.name}</p>
            <p>{customer.email}</p>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
            <button onClick={() => runAction(modal.action)} disabled={busy} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#e05a2b] rounded-xl transition-colors capitalize disabled:opacity-50">
              {busy ? "Working..." : modal.action.replaceAll("-", " ")}
            </button>
          </div>
        </ModalShell>
      )}

      {modal.kind === "block" && (
        <ModalShell title="Block Customer" onClose={() => setModal({ kind: "none" })}>
          <p className="text-sm text-gray-600 mb-3">Are you sure you want to block this customer? Their email will be added to the block list and they will not be able to sign in or place orders.</p>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 mb-4">
            <p className="font-semibold text-[#1F1F1F]">{customer.name}</p>
            <p>{customer.email}</p>
          </div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason *</label>
          <select
            value={modal.reason}
            onChange={(e) => setModal({ ...modal, reason: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 mb-3"
          >
            <option value="">Select a reason...</option>
            {BLOCK_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Details {modal.reason === "Other" ? "*" : "(optional)"}</label>
          <textarea
            value={modal.details}
            onChange={(e) => setModal({ ...modal, details: e.target.value })}
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
            <button onClick={() => runAction("block", { reason: modal.reason, reasonDetails: modal.details })} disabled={busy || !modal.reason} className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50">
              {busy ? "Blocking..." : "Block Customer"}
            </button>
          </div>
        </ModalShell>
      )}

      {modal.kind === "delete" && (
        <ModalShell title="Soft Delete Account" onClose={() => setModal({ kind: "none" })}>
          <p className="text-sm text-gray-600">This will hide the account so the customer cannot sign in. All historical orders, payments and audit records are preserved. This is reversible via Activate.</p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
            <button onClick={() => runAction("delete")} disabled={busy} className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50">
              {busy ? "Deleting..." : "Soft Delete"}
            </button>
          </div>
        </ModalShell>
      )}

      {modal.kind === "reset-link" && (
        <ModalShell title="Password Reset Link" onClose={() => setModal({ kind: "none" })}>
          <p className="text-sm text-gray-600 mb-1">A secure, single-use reset link was generated. The password is never revealed. Share this link securely with the customer:</p>
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-mono text-[#FF6B35] break-all">{modal.resetLink}</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Expires: {new Date(modal.expiresAt).toLocaleString("en-GB")}. Single use only.</p>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setModal({ kind: "none" })} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#e05a2b] rounded-xl transition-colors">Done</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#1F1F1F]">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
