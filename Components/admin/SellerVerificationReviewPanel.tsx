"use client";

import React, { useState } from "react";
import {
  FiCheck,
  FiX,
  FiRefreshCw,
  FiFileText,
  FiImage,
  FiVideo,
  FiAlertTriangle,
  FiMaximize2,
} from "react-icons/fi";
import { useModal } from "@/lib/hooks/useModal";

interface VerificationImage {
  key: string;
  label: string;
  path: string;
}

interface VerificationData {
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

const IMAGE_LABELS: Record<string, string> = {
  profile_face: "Profile / Face Image",
  identity_selfie: "Identity Verification Image (holding CNIC)",
  business_store: "Business / Store Image",
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  VERIFIED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600",
  RESUBMISSION_REQUESTED: "bg-orange-50 text-orange-600",
};

type ItemKey = "cnic" | "images" | "video";

interface ReviewPanelProps {
  sellerId: string;
  verification: VerificationData | null;
  onChanged?: () => void;
}

export default function SellerVerificationReviewPanel({ sellerId, verification, onChanged }: ReviewPanelProps) {
  const [busyItem, setBusyItem] = useState<ItemKey | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [preview, setPreview] = useState<{ kind: "image" | "video"; src: string; label: string } | null>(null);

  const [modal, setModal] = useState<{
    kind: "none" | "reject" | "resubmit";
    item: ItemKey;
    reason: string;
  }>({ kind: "none", item: "cnic", reason: "" });

  const isModalOpen = modal.kind !== "none";
  useModal(isModalOpen, () => setModal({ kind: "none", item: "cnic", reason: "" }));

  const flash = (type: "ok" | "err", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  if (!verification) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-[#1F1F1F] mb-3">Identity Verification</h3>
        <p className="text-sm text-gray-400 py-4 text-center">No verification submitted yet.</p>
      </div>
    );
  }

  const fileUrl = (p: string) => `/api/seller/verification/file?path=${encodeURIComponent(p)}`;

  const doReview = async (action: "VERIFIED" | "REJECTED" | "RESUBMISSION_REQUESTED", item: ItemKey, reason?: string) => {
    setBusyItem(item);
    try {
      const res = await fetch(`/api/admin/marketplace/sellers/${encodeURIComponent(sellerId)}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Action failed");
        return;
      }
      flash("ok", `${itemLabel(item)} updated to ${action}.`);
      onChanged?.();
    } catch {
      flash("err", "Network error — action failed");
    } finally {
      setBusyItem(null);
      setModal({ kind: "none", item: "cnic", reason: "" });
    }
  };

  const itemLabel = (item: ItemKey) => (item === "cnic" ? "CNIC" : item === "images" ? "Verification Images" : "Live Video");

  const ItemActions = ({ item }: { item: ItemKey }) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => doReview("VERIFIED", item)}
        disabled={busyItem === item}
        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        <FiCheck size={13} /> Verify
      </button>
      <button
        onClick={() => setModal({ kind: "reject", item, reason: "" })}
        disabled={busyItem === item}
        className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        <FiX size={13} /> Reject
      </button>
      <button
        onClick={() => setModal({ kind: "resubmit", item, reason: "" })}
        disabled={busyItem === item}
        className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        <FiRefreshCw size={13} /> Request Resubmission
      </button>
    </div>
  );

  const ReasonNote = ({ reason }: { reason: string | null }) =>
    reason ? <p className="text-xs text-gray-400 mt-1.5"><span className="font-semibold text-gray-500">Admin note:</span> {reason}</p> : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-[#1F1F1F]">Identity Verification</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Submitted {verification.submittedAt ? new Date(verification.submittedAt).toLocaleString() : "—"}
          {verification.updatedAt ? ` &middot; Updated ${new Date(verification.updatedAt).toLocaleString()}` : ""}
        </p>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
          {feedback.msg}
        </div>
      )}

      {/* --- CNIC --- */}
      <div className="rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400"><FiFileText size={16} /></span>
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">CNIC (Front & Back)</p>
              <p className="text-sm text-gray-500">Full number: <span className="font-mono font-semibold text-[#1F1F1F]">{verification.cnicNumber || "—"}</span></p>
              <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[verification.cnicStatus] || "bg-gray-100 text-gray-500"}`}>
                {verification.cnicStatus}
              </span>
            </div>
          </div>
        </div>
        <ReasonNote reason={verification.cnicReason} />
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Front", path: verification.cnicFrontPath },
            { label: "Back", path: verification.cnicBackPath },
          ].map((img) => (
            <div key={img.label} className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-bold text-gray-500">CNIC {img.label}</span>
                {img.path && (
                  <button onClick={() => setPreview({ kind: "image", src: fileUrl(img.path!), label: `CNIC ${img.label}` })} className="text-gray-400 hover:text-[#FF6B35]" title="Zoom">
                    <FiMaximize2 size={13} />
                  </button>
                )}
              </div>
              {img.path ? (
                <img src={fileUrl(img.path)} alt={`CNIC ${img.label}`} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 flex items-center justify-center text-gray-300"><FiFileText size={24} /></div>
              )}
            </div>
          ))}
        </div>
        <ItemActions item="cnic" />
      </div>

      {/* --- Verification Images --- */}
      <div className="rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400"><FiImage size={16} /></span>
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Verification Images</p>
              <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[verification.imagesStatus] || "bg-gray-100 text-gray-500"}`}>
                {verification.imagesStatus}
              </span>
            </div>
          </div>
        </div>
        <ReasonNote reason={verification.imagesReason} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {verification.verificationImages.length === 0 ? (
            <p className="text-sm text-gray-400 sm:col-span-3 text-center py-4">No images uploaded.</p>
          ) : (
            verification.verificationImages.map((img) => (
              <div key={img.key} className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-500 truncate">{IMAGE_LABELS[img.key] || img.label || img.key}</span>
                  <button onClick={() => setPreview({ kind: "image", src: fileUrl(img.path), label: IMAGE_LABELS[img.key] || img.label || img.key })} className="text-gray-400 hover:text-[#FF6B35] ml-2" title="Zoom">
                    <FiMaximize2 size={13} />
                  </button>
                </div>
                <img src={fileUrl(img.path)} alt={IMAGE_LABELS[img.key] || img.label} className="w-full h-32 object-cover" />
              </div>
            ))
          )}
        </div>
        <ItemActions item="images" />
      </div>

      {/* --- Live Video --- */}
      <div className="rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400"><FiVideo size={16} /></span>
            <div>
              <p className="text-sm font-bold text-[#1F1F1F]">Live Camera Video</p>
              <p className="text-xs text-gray-400">{verification.liveVideoDuration ? `${verification.liveVideoDuration}s` : "Duration unavailable"}</p>
              <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[verification.videoStatus] || "bg-gray-100 text-gray-500"}`}>
                {verification.videoStatus}
              </span>
            </div>
          </div>
        </div>
        <ReasonNote reason={verification.videoReason} />
        {verification.liveVideoPath ? (
          <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-[11px] font-bold text-gray-500">Live Recording</span>
              <button onClick={() => setPreview({ kind: "video", src: fileUrl(verification.liveVideoPath!), label: "Live Camera Video" })} className="text-gray-400 hover:text-[#FF6B35]" title="Open">
                <FiMaximize2 size={13} />
              </button>
            </div>
            <video src={fileUrl(verification.liveVideoPath)} controls className="w-full max-h-64 bg-black" />
          </div>
        ) : (
          <div className="w-full h-32 flex items-center justify-center text-gray-300 rounded-xl bg-gray-50 border border-gray-100"><FiVideo size={24} /></div>
        )}
        <ItemActions item="video" />
      </div>

      {/* --- Preview modal --- */}
      {preview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">{preview.label}</p>
              <button onClick={() => setPreview(null)} className="text-white/70 hover:text-white font-bold text-lg">&times;</button>
            </div>
            {preview.kind === "image" ? (
              <img src={preview.src} alt={preview.label} className="w-full max-h-[80vh] object-contain rounded-xl bg-black" />
            ) : (
              <video src={preview.src} controls autoPlay className="w-full max-h-[80vh] rounded-xl bg-black" />
            )}
          </div>
        </div>
      )}

      {/* --- Reject / Resubmit modal --- */}
      {modal.kind !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F1F1F]">
                {modal.kind === "reject" ? `Reject ${itemLabel(modal.item)}` : `Request Resubmission — ${itemLabel(modal.item)}`}
              </h3>
              <button onClick={() => setModal({ kind: "none", item: "cnic", reason: "" })} className="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl mb-3">
              <FiAlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                The seller will be notified immediately and must resubmit the {itemLabel(modal.item).toLowerCase()}.
              </p>
            </div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Reason *</label>
            <textarea
              autoFocus
              value={modal.reason}
              onChange={(e) => setModal({ ...modal, reason: e.target.value })}
              rows={3}
              placeholder="Explain what needs to change..."
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 resize-none mb-3"
            />
            <div className="mt-2 flex justify-end gap-3">
              <button onClick={() => setModal({ kind: "none", item: "cnic", reason: "" })} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={() => doReview(modal.kind === "reject" ? "REJECTED" : "RESUBMISSION_REQUESTED", modal.item, modal.reason)}
                disabled={busyItem === modal.item || !modal.reason.trim()}
                className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${modal.kind === "reject" ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"}`}
              >
                {busyItem === modal.item ? "Saving..." : modal.kind === "reject" ? "Reject" : "Request Resubmission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
