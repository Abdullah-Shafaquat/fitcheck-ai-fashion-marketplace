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
  FiEdit2,
  FiCheck,
  FiX,
  FiGrid,
  FiDollarSign,
  FiPackage,
  FiExternalLink,
  FiAlertTriangle,
} from "react-icons/fi";
import { useModal } from "@/lib/hooks/useModal";
import SellerVerificationReviewPanel from "@/Components/admin/SellerVerificationReviewPanel";

interface VerificationImage {
  key: string;
  label: string;
  path: string;
}

interface SellerVerification {
  id: string;
  cnicStatus: string;
  cnicReason: string | null;
  imagesStatus: string;
  imagesReason: string | null;
  videoStatus: string;
  videoReason: string | null;
  submittedAt: string | null;
  resubmissionRequiredAt: string | null;
  lastReviewedBy: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  liveVideoDuration: number | null;
  liveVideoThumbnail: string | null;
  cnicNumber: string | null;
  cnicFrontPath: string | null;
  cnicBackPath: string | null;
  verificationImages: VerificationImage[];
  liveVideoPath: string | null;
}

interface SellerProduct {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    category: string;
    stock: number;
    approvalStatus: string;
    isActive: boolean;
    images: string[];
    rejectionReason: string | null;
  };
}

interface SellerPayout {
  id: string;
  amount: number;
  status: string;
  method: string;
  requestedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  performedBy: string | null;
  target: string | null;
  details: string | null;
  createdAt: string;
}

interface SellerDetail {
  id: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  address: string;
  city: string;
  province: string;
  country: string;
  verificationDoc: string | null;
  socialLinks: Record<string, string>;
  logo: string | null;
  banner: string | null;
  supportContact: string;
  approvalStatus: string;
  rejectionReason: string | null;
  commissionRate: number;
  adminNotes: string;
  blockedAt: string | null;
  blockedBy: string | null;
  blockReason: string | null;
  blockReasonDetails: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalPaidOut: number;
  user: { name: string; email: string; accountStatus: string };
  products: SellerProduct[];
  payouts: SellerPayout[];
  auditLogs: AuditLog[];
  verification: SellerVerification | null;
  verificationStatus: string | null;
}

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-blue-50 text-blue-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  SUSPENDED: "bg-gray-100 text-gray-500",
  BLOCKED: "bg-red-100 text-red-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-emerald-50 text-emerald-600",
};

const payoutStatusBadge: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  PROCESSING: "bg-indigo-50 text-indigo-600",
  PAID: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  FAILED: "bg-red-100 text-red-700",
};

const productStatusBadge: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  DRAFT: "bg-gray-100 text-gray-500",
};

type ModalState =
  | { kind: "none" }
  | { kind: "status-change"; status: string; reason: string; reasonDetails: string }
  | { kind: "reject-product"; productId: string; reason: string }
  | { kind: "reject-payout"; payoutId: string; reason: string };

export default function SellerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ storeName: "", ownerName: "", phone: "", businessType: "", description: "", commissionRate: 0, adminNotes: "" });
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [busyPayoutId, setBusyPayoutId] = useState<string | null>(null);

  const isModalOpen = modal.kind !== "none";
  useModal(isModalOpen, () => setModal({ kind: "none" }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/marketplace/sellers/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load seller");
      setSeller(data.seller);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load seller");
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

  const handleStatusChange = async () => {
    if (modal.kind !== "status-change") return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/marketplace/sellers/${encodeURIComponent(id)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modal.status, reason: modal.reason || undefined, reasonDetails: modal.reasonDetails || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Action failed");
        return;
      }
      setSeller(data.seller);
      flash("ok", data.message || "Status updated");
    } catch {
      flash("err", "Network error — action failed");
    } finally {
      setBusy(false);
      setModal({ kind: "none" });
    }
  };

  const openStatusChange = (status: string) => {
    if (["REJECTED", "BLOCKED", "SUSPENDED"].includes(status)) {
      setModal({ kind: "status-change", status, reason: "", reasonDetails: "" });
    } else {
      setBusy(true);
      fetch(`/api/admin/marketplace/sellers/${encodeURIComponent(id)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.seller) setSeller(data.seller);
          flash(data.error ? "err" : "ok", data.message || (data.error || "Action completed"));
        })
        .catch(() => flash("err", "Network error"))
        .finally(() => setBusy(false));
    }
  };

  const handleEditSave = async () => {
    if (!seller) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/marketplace/sellers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Update failed");
        return;
      }
      setSeller(data.seller);
      setEditOpen(false);
      flash("ok", "Seller updated");
    } catch {
      flash("err", "Network error — update failed");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    if (!seller) return;
    setEditForm({
      storeName: seller.storeName,
      ownerName: seller.ownerName,
      phone: seller.phone,
      businessType: seller.businessType,
      description: seller.description,
      commissionRate: seller.commissionRate,
      adminNotes: seller.adminNotes,
    });
    setEditOpen(true);
  };

  const handleProductAction = async (productId: string, status: string, reason?: string) => {
    setBusyProductId(productId);
    try {
      const body: Record<string, string> = { status };
      if (reason) body.reason = reason;
      const res = await fetch(`/api/admin/marketplace/products/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) load();
      else flash("err", "Product action failed");
    } catch {
      flash("err", "Network error");
    } finally {
      setBusyProductId(null);
    }
  };

  const handlePayoutAction = async (payoutId: string, status: string, reason?: string) => {
    setBusyPayoutId(payoutId);
    try {
      const body: Record<string, string> = { status };
      if (reason) body.reason = reason;
      const res = await fetch(`/api/admin/marketplace/payouts/${payoutId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) load();
      else flash("err", "Payout action failed");
    } catch {
      flash("err", "Network error");
    } finally {
      setBusyPayoutId(null);
    }
  };

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

  if (error || !seller) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <FiAlertTriangle size={36} className="text-red-400" />
        <p className="text-sm text-gray-500">{error || "Seller not found"}</p>
        <Link href="/admin/marketplace/sellers" className="px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-colors">
          Back to Sellers
        </Link>
      </div>
    );
  }

  const badge = statusBadge[seller.approvalStatus] || "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <Link href="/admin/marketplace/sellers" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-[#FF6B35] transition-colors mb-2">
            <FiArrowLeft size={14} /> Back to Sellers
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-[#FF6B35] to-[#ff8f66] flex items-center justify-center text-white font-bold flex-shrink-0">
              {seller.logo ? (
                <img src={seller.logo} alt={seller.storeName} className="w-full h-full object-cover" />
              ) : (
                <FiGrid size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#1F1F1F]">{seller.storeName}</h1>
                <Link href={`/store/${seller.storeSlug}`} target="_blank" className="text-gray-400 hover:text-[#FF6B35] transition-colors" title="View storefront">
                  <FiExternalLink size={16} />
                </Link>
              </div>
              <p className="text-xs text-gray-400">/{seller.storeSlug}</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex self-start text-xs font-bold px-3 py-1.5 rounded-full ${badge}`}>
          {seller.approvalStatus}
        </span>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <FiMail size={14} className="text-gray-400" /> {seller.email}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FiPhone size={14} className="text-gray-400" /> {seller.phone || "—"}
              </div>
              <div className="text-gray-600">
                <span className="text-gray-400 text-xs">Business:</span> {seller.businessType || "—"}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <FiCalendar size={14} className="text-gray-400" /> Joined {fmtDate(seller.createdAt)}
              </div>
              {seller.approvedAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FiCheck size={14} className="text-emerald-400" /> Approved {fmtDate(seller.approvedAt)}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={openEdit} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-sm font-semibold text-[#1F1F1F] rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                <FiEdit2 size={15} /> Edit Store Info
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-[#1F1F1F] mb-3">Status Actions</h3>
            <div className="flex flex-wrap gap-2">
              {seller.approvalStatus !== "APPROVED" && (
                <button onClick={() => openStatusChange("APPROVED")} disabled={busy} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50">
                  Approve
                </button>
              )}
              {seller.approvalStatus !== "REJECTED" && (
                <button onClick={() => openStatusChange("REJECTED")} disabled={busy} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                  Reject
                </button>
              )}
              {seller.approvalStatus !== "SUSPENDED" && (
                <button onClick={() => openStatusChange("SUSPENDED")} disabled={busy} className="px-3 py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors disabled:opacity-50">
                  Suspend
                </button>
              )}
              {seller.approvalStatus !== "BLOCKED" && (
                <button onClick={() => openStatusChange("BLOCKED")} disabled={busy} className="px-3 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50">
                  Block
                </button>
              )}
              {seller.approvalStatus !== "INACTIVE" && (
                <button onClick={() => openStatusChange("INACTIVE")} disabled={busy} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Inactive
                </button>
              )}
              {seller.approvalStatus !== "UNDER_REVIEW" && seller.approvalStatus !== "PENDING" && (
                <button onClick={() => openStatusChange("UNDER_REVIEW")} disabled={busy} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50">
                  Under Review
                </button>
              )}
            </div>
          </div>

          {(seller.blockReason || seller.rejectionReason) && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-sm font-bold text-red-700 mb-2">
                {seller.blockReason ? "Blocked Info" : "Rejection Info"}
              </p>
              <div className="space-y-1 text-xs text-red-600">
                {seller.blockReason && <p>Reason: <span className="font-semibold">{seller.blockReason}</span></p>}
                {(seller.blockReasonDetails || seller.rejectionReason) && <p>{seller.blockReasonDetails || seller.rejectionReason}</p>}
                {seller.blockedAt && <p>Blocked: {fmtDate(seller.blockedAt)}</p>}
                {seller.blockedBy && <p>By: {seller.blockedBy}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Available", value: seller.availableBalance },
              { label: "Pending", value: seller.pendingBalance },
              { label: "Total Earnings", value: seller.totalEarnings },
              { label: "Paid Out", value: seller.totalPaidOut },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <p className="text-lg font-black text-[#1F1F1F]">Rs {s.value.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {editOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Edit Store Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Store Name</label>
                  <input value={editForm.storeName} onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Owner Name</label>
                  <input value={editForm.ownerName} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Business Type</label>
                  <input value={editForm.businessType} onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Commission Rate (%)</label>
                  <input type="number" min={0} max={100} step={0.5} value={editForm.commissionRate} onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Admin Notes</label>
                  <textarea value={editForm.adminNotes} onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 resize-none" />
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

          <SellerVerificationReviewPanel sellerId={id} verification={seller.verification} onChanged={load} />

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Products ({seller.products.length})</h3>
            {seller.products.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No products</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Product", "Price", "Category", "Stock", "Status", "Actions"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seller.products.map((sp) => (
                      <tr key={sp.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {sp.product.images?.[0] ? (
                                  <img src={sp.product.images[0]} alt={sp.product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><FiPackage size={12} className="text-gray-300" /></div>
                                )}
                              </div>
                              {sp.product.slug ? (
                                <Link
                                  href={`/products/${sp.product.slug}`}
                                  target="_blank"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-[#1F1F1F] truncate max-w-[160px] hover:text-[#FF6B35] transition-colors flex items-center gap-1.5"
                                  title={`View ${sp.product.name}`}
                                >
                                  {sp.product.name}
                                  <FiExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                                </Link>
                              ) : (
                                <span className="font-semibold text-[#1F1F1F] truncate max-w-[180px]">{sp.product.name}</span>
                              )}
                            </div>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-[#1F1F1F]">Rs {sp.product.price.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{sp.product.category}</td>
                        <td className="px-3 py-2.5 text-gray-600">{sp.product.stock}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${productStatusBadge[sp.product.approvalStatus] || "bg-gray-100 text-gray-500"}`}>
                            {sp.product.approvalStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {sp.product.approvalStatus === "PENDING_REVIEW" && (
                              <>
                                <button
                                  onClick={() => handleProductAction(sp.product.id, "APPROVED")}
                                  disabled={busyProductId === sp.product.id}
                                  className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <FiCheck size={14} />
                                </button>
                                <button
                                  onClick={() => setModal({ kind: "reject-product", productId: sp.product.id, reason: "" })}
                                  disabled={busyProductId === sp.product.id}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <FiX size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Payouts ({seller.payouts.length})</h3>
            {seller.payouts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No payouts</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Amount", "Method", "Status", "Requested", "Actions"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seller.payouts.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50/80 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-[#1F1F1F]">Rs {p.amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{p.method}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${payoutStatusBadge[p.status] || "bg-gray-100 text-gray-500"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{fmtDate(p.requestedAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {(p.status === "PENDING" || p.status === "APPROVED") && (
                              <button
                                onClick={() => handlePayoutAction(p.id, "APPROVED")}
                                disabled={busyPayoutId === p.id}
                                className="px-2 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}
                            {(p.status === "PENDING" || p.status === "APPROVED") && (
                              <button
                                onClick={() => setModal({ kind: "reject-payout", payoutId: p.id, reason: "" })}
                                disabled={busyPayoutId === p.id}
                                className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-[#1F1F1F] mb-4">Audit Log</h3>
            {seller.auditLogs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No audit records</p>
            ) : (
              <div className="space-y-3">
                {seller.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <FiClock size={13} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1F1F1F]">{log.action}</p>
                      {log.target && <p className="text-xs text-gray-400">Target: {log.target}</p>}
                      {log.performedBy && <p className="text-xs text-gray-400">By: {log.performedBy}</p>}
                      {log.details && <p className="text-xs text-gray-400 mt-0.5 break-words">{log.details}</p>}
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0">{fmtDate(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal.kind === "status-change" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Change Status to {modal.status}</h3>
              <button onClick={() => setModal({ kind: "none" })} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason *</label>
            <input
              value={modal.reason}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
              placeholder="Reason..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 mb-3"
            />
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Details (optional)</label>
            <textarea
              value={modal.reasonDetails}
              onChange={(e) => setModal({ ...modal, reasonDetails: e.target.value })}
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleStatusChange} disabled={busy || !modal.reason.trim()} className="px-6 py-2.5 text-sm font-semibold text-white bg-[#FF6B35] hover:bg-[#e05a2b] rounded-xl transition-colors disabled:opacity-50">
                {busy ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.kind === "reject-product" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Reject Product</h3>
              <button onClick={() => setModal({ kind: "none" })} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason</label>
            <textarea
              value={modal.reason}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  handleProductAction(modal.productId, "REJECTED", modal.reason);
                  setModal({ kind: "none" });
                }}
                disabled={busyProductId === modal.productId}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {busyProductId === modal.productId ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.kind === "reject-payout" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">Reject Payout</h3>
              <button onClick={() => setModal({ kind: "none" })} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason *</label>
            <textarea
              value={modal.reason}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
              rows={3}
              placeholder="Reason for rejection..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setModal({ kind: "none" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => {
                  handlePayoutAction(modal.payoutId, "REJECTED", modal.reason);
                  setModal({ kind: "none" });
                }}
                disabled={busyPayoutId === modal.payoutId || !modal.reason.trim()}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {busyPayoutId === modal.payoutId ? "Rejecting..." : "Reject Payout"}
              </button>
            </div>
          </div>
        </div>
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
