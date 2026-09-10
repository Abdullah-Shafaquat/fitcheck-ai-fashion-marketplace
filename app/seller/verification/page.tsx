"use client";

import React, { useEffect, useState } from "react";
import {
  FiShield,
  FiFileText,
  FiImage,
  FiVideo,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";
import VerificationImageUpload from "@/Components/seller/VerificationImageUpload";
import LiveCameraRecorder from "@/Components/seller/LiveCameraRecorder";

const VERIFICATION_IMAGE_DEFS = [
  { key: "profile_face", label: "Profile / Face Image" },
  { key: "identity_selfie", label: "Identity Verification Image" },
  { key: "business_store", label: "Business / Store Image" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "VERIFIED")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2.5 py-1">
        <FiCheckCircle size={12} /> Verified
      </span>
    );
  if (status === "REJECTED" || status === "RESUBMISSION_REQUESTED")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-600 rounded-full px-2.5 py-1">
        <FiXCircle size={12} /> Action Required
      </span>
    );
  if (status === "UNDER_REVIEW" || status === "SUBMITTED")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded-full px-2.5 py-1">
        <FiClock size={12} /> Under Review
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 rounded-full px-2.5 py-1">
      <FiClock size={12} /> Pending
    </span>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SellerVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [approvalStatus, setApprovalStatus] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("NOT_SUBMITTED");

  // Existing verification data (paths prefilled so verified items are preserved)
  const [cnicNumber, setCnicNumber] = useState("");
  const [cnicFront, setCnicFront] = useState("");
  const [cnicBack, setCnicBack] = useState("");
  const [images, setImages] = useState<Record<string, string>>({
    profile_face: "",
    identity_selfie: "",
    business_store: "",
  });
  const [videoPath, setVideoPath] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // Per-item statuses from server
  const [statuses, setStatuses] = useState({
    cnic: "PENDING",
    cnicReason: "",
    images: "PENDING",
    imagesReason: "",
    video: "PENDING",
    videoReason: "",
  });

  const canEdit = (st: string) =>
    st !== "VERIFIED";

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/verification");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load verification status.");
        return;
      }
      setApprovalStatus(data.seller?.approvalStatus || "");
      setVerificationStatus(data.seller?.verificationStatus || "NOT_SUBMITTED");
      const v = data.verification;
      if (v) {
        setStatuses({
          cnic: v.cnicStatus || "PENDING",
          cnicReason: v.cnicReason || "",
          images: v.imagesStatus || "PENDING",
          imagesReason: v.imagesReason || "",
          video: v.videoStatus || "PENDING",
          videoReason: v.videoReason || "",
        });
        setCnicNumber(v.cnicNumber || "");
        setCnicFront(v.cnicFrontPath || "");
        setCnicBack(v.cnicBackPath || "");
        setVideoPath(v.liveVideoPath || "");
        setVideoDuration(v.liveVideoDuration ?? null);
        if (Array.isArray(v.verificationImages)) {
          const next = { ...images };
          v.verificationImages.forEach(
            (im: any) => im?.key && im.path && (next[im.key] = im.path)
          );
          setImages(next);
        }
      }
    } catch {
      setError("Network error loading verification status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cnicValid = /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cnicNumber);
  const allImages = VERIFICATION_IMAGE_DEFS.every((d) => images[d.key]);
  const ready =
    cnicValid && !!cnicFront && !!cnicBack && allImages && !!videoPath;

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/seller/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnicNumber,
          cnicFrontPath: cnicFront,
          cnicBackPath: cnicBack,
          images: VERIFICATION_IMAGE_DEFS.map((d) => ({
            key: d.key,
            label: d.label,
            path: images[d.key],
          })),
          liveVideoPath: videoPath,
          liveVideoDuration: videoDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit verification.");
        return;
      }
      setSuccess("Verification submitted. You will be notified once our team reviews it.");
      load();
    } catch {
      setError("Network error submitting verification.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const topBanner = (() => {
    if (approvalStatus === "APPROVED") {
      return {
        color: "bg-emerald-50 border-emerald-200 text-emerald-700",
        icon: <FiCheckCircle size={16} className="mt-0.5 shrink-0" />,
        title: "You're approved! You now have full seller dashboard access.",
      };
    }
    if (verificationStatus === "VERIFIED") {
      return {
        color: "bg-emerald-50 border-emerald-200 text-emerald-700",
        icon: <FiCheckCircle size={16} className="mt-0.5 shrink-0" />,
        title: "All verifications complete. Our team will finalize approval shortly.",
      };
    }
    if (
      verificationStatus === "RESUBMISSION_REQUIRED" ||
      verificationStatus === "SUBMITTED" ||
      verificationStatus === "UNDER_REVIEW"
    ) {
      return {
        color: "bg-blue-50 border-blue-200 text-blue-700",
        icon: <FiClock size={16} className="mt-0.5 shrink-0" />,
        title: "Your identity verification requires attention or is under review.",
      };
    }
    return {
      color: "bg-amber-50 border-amber-200 text-amber-700",
      icon: <FiShield size={16} className="mt-0.5 shrink-0" />,
      title: "Complete all three verification steps to become an approved seller.",
    };
  })();

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className={`flex items-start gap-3 border rounded-2xl px-4 py-3 text-sm ${topBanner.color}`}
      >
        {topBanner.icon}
        <div>
          <p className="font-semibold">{topBanner.title}</p>
          <p className="text-xs opacity-80 mt-0.5">
            Your documents are private and securely protected. Only you and
            authorized FitCheck admins can view them.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3">
          <FiCheckCircle className="mt-0.5 shrink-0" size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* CNIC section */}
      <Section
        icon={FiFileText}
        title="1. CNIC / Identity Card"
        status={<StatusBadge status={statuses.cnic} />}
        reason={
          statuses.cnic === "REJECTED" || statuses.cnic === "RESUBMISSION_REQUESTED"
            ? statuses.cnicReason
            : ""
        }
      >
        {canEdit(statuses.cnic) ? (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                CNIC Number
              </label>
              <input
                value={cnicNumber}
                onChange={(e) => setCnicNumber(e.target.value)}
                placeholder="#####-#######-#"
                maxLength={15}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
              />
              {cnicNumber && !cnicValid && (
                <p className="text-xs text-red-500 mt-1">
                  Enter 13 digits as #####-#######-#
                </p>
              )}
              {cnicNumber && cnicValid && (
                <p className="text-xs text-gray-400 mt-1">
                  Stored as {cnicNumber} (masked outside admin review)
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <VerificationImageUpload
                label="CNIC Front"
                kind="cnic"
                value={cnicFront}
                onChange={setCnicFront}
              />
              <VerificationImageUpload
                label="CNIC Back"
                kind="cnic"
                value={cnicBack}
                onChange={setCnicBack}
              />
            </div>
          </div>
        ) : (
          <>
            {statuses.cnicReason && (
              <p className="text-xs text-gray-400">
                Reason: <span className="text-gray-600">{statuses.cnicReason}</span>
              </p>
            )}
            <div className="flex gap-4 mt-2">
              {cnicFront && (
                <img
                  src={`/api/seller/verification/file?path=${encodeURIComponent(cnicFront)}`}
                  alt="CNIC front"
                  className="w-32 h-24 object-cover rounded-lg border border-gray-200"
                />
              )}
              {cnicBack && (
                <img
                  src={`/api/seller/verification/file?path=${encodeURIComponent(cnicBack)}`}
                  alt="CNIC back"
                  className="w-32 h-24 object-cover rounded-lg border border-gray-200"
                />
              )}
            </div>
          </>
        )}
      </Section>

      {/* Images section */}
      <Section
        icon={FiImage}
        title="2. Required Verification Images"
        status={<StatusBadge status={statuses.images} />}
        reason={
          statuses.images === "REJECTED" || statuses.images === "RESUBMISSION_REQUESTED"
            ? statuses.imagesReason
            : ""
        }
      >
        {canEdit(statuses.images) ? (
          <div className="space-y-5">
            {VERIFICATION_IMAGE_DEFS.map((def) => (
              <VerificationImageUpload
                key={def.key}
                label={def.label}
                kind="verification_image"
                value={images[def.key]}
                onChange={(p) => setImages((prev) => ({ ...prev, [def.key]: p }))}
              />
            ))}
          </div>
        ) : (
          <>
            {statuses.imagesReason && (
              <p className="text-xs text-gray-400">
                Reason: <span className="text-gray-600">{statuses.imagesReason}</span>
              </p>
            )}
            <div className="flex gap-4 mt-2">
              {VERIFICATION_IMAGE_DEFS.map((def) =>
                images[def.key] ? (
                  <img
                    key={def.key}
                    src={`/api/seller/verification/file?path=${encodeURIComponent(images[def.key])}`}
                    alt={def.label}
                    className="w-32 h-24 object-cover rounded-lg border border-gray-200"
                  />
                ) : null
              )}
            </div>
          </>
        )}
      </Section>

      {/* Video section */}
      <Section
        icon={FiVideo}
        title="3. Live Camera Video"
        status={<StatusBadge status={statuses.video} />}
        reason={
          statuses.video === "REJECTED" || statuses.video === "RESUBMISSION_REQUESTED"
            ? statuses.videoReason
            : ""
        }
      >
        {canEdit(statuses.video) ? (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <FiVideo size={14} className="text-[#FF6B35]" />
              You must record a live video with your device camera — uploading an
              existing video is not allowed.
            </div>
            <LiveCameraRecorder
              onRecorded={(r) => {
                setVideoPath(r.path);
                setVideoDuration(r.duration);
              }}
              maxDurationSeconds={60}
            />
            {videoPath && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mt-3">
                <FiCheckCircle size={14} />
                Recorded ({videoDuration ?? 0}s) — ready to submit.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 mt-2">
              {videoPath && (
                <video
                  src={`/api/seller/verification/file?path=${encodeURIComponent(videoPath)}`}
                  controls
                  className="w-72 h-44 object-cover rounded-xl border border-gray-200 bg-black"
                />
              )}
            </div>
            {videoDuration != null && (
              <p className="text-xs text-gray-400 mt-2">
                Duration: {videoDuration}s
              </p>
            )}
          </>
        )}
      </Section>

      {/* Overall checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-[#1F1F1F] mb-3">Application Summary</p>
        <div className="space-y-2">
          <Row label="Identity Card" done={!!cnicFront && !!cnicBack} />
          <Row label="Verification Images" done={allImages} />
          <Row label="Live Camera Video" done={!!videoPath} />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!ready || saving}
          className="w-full sm:w-auto mt-5 h-11 px-6 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <FiShield size={16} /> Submit Verification
            </>
          )}
        </button>
        {!ready && (
          <p className="text-xs text-gray-400 mt-2">
            Complete all required items to submit.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`text-xs font-semibold flex items-center gap-1 ${
          done ? "text-emerald-500" : "text-gray-400"
        }`}
      >
        {done ? (
          <>
            <FiCheckCircle size={13} /> Submitted
          </>
        ) : (
          "Pending"
        )}
      </span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  status,
  reason,
  children,
}: {
  icon: React.ElementType;
  title: string;
  status: React.ReactNode;
  reason?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center">
            <Icon size={20} className="text-[#FF6B35]" />
          </div>
          <h3 className="font-bold text-[#1F1F1F]">{title}</h3>
        </div>
        {status}
      </div>
      {reason && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 mb-4">
          <FiAlertCircle className="mt-0.5 shrink-0" size={14} />
          <span>
            Reason from admin: <strong>{reason}</strong>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
