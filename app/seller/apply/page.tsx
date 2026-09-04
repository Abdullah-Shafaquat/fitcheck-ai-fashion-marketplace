"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiMapPin,
  FiGlobe,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiFileText,
  FiImage,
  FiVideo,
  FiShield,
  FiAlertCircle,
} from "react-icons/fi";
import VerificationImageUpload from "@/Components/seller/VerificationImageUpload";
import LiveCameraRecorder from "@/Components/seller/LiveCameraRecorder";

const STEPS = [
  { num: 1, label: "Personal", icon: FiUser },
  { num: 2, label: "Business", icon: FiGlobe },
  { num: 3, label: "CNIC", icon: FiFileText },
  { num: 4, label: "Images", icon: FiImage },
  { num: 5, label: "Video", icon: FiVideo },
  { num: 6, label: "Review", icon: FiShield },
];

const VERIFICATION_IMAGE_DEFS = [
  { key: "profile_face", label: "Profile / Face Image", help: "A clear, recent photo of your face." },
  { key: "identity_selfie", label: "Identity Verification Image", help: "A selfie of you holding your CNIC." },
  { key: "business_store", label: "Business / Store Image", help: "A photo of your store or business." },
];

export default function SellerApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState<string>("");

  const [account, setAccount] = useState({
    email: "",
    password: "",
    ownerName: "",
    phone: "",
  });
  const [business, setBusiness] = useState({
    storeName: "",
    businessType: "dropshipping",
    description: "",
    address: "",
    city: "",
    province: "",
    country: "Pakistan",
    supportContact: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  });
  const [cnic, setCnic] = useState({ number: "", front: "", back: "" });
  const [images, setImages] = useState<Record<string, string>>({
    profile_face: "",
    identity_selfie: "",
    business_store: "",
  });
  const [video, setVideo] = useState<{ path: string; duration: number } | null>(null);

  const updateAccount = (k: string, v: string) =>
    setAccount((p) => ({ ...p, [k]: v }));
  const updateBusiness = (k: string, v: string) =>
    setBusiness((p) => ({ ...p, [k]: v }));

  const cnicValid = /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cnic.number);
  const allImagesUploaded = VERIFICATION_IMAGE_DEFS.every((d) => images[d.key]);

  // Step validation
  const stepValid = (): string => {
    if (step === 1) {
      if (!/^\S+@\S+\.\S+$/.test(account.email)) return "Enter a valid email address.";
      if (account.password.length < 6) return "Password must be at least 6 characters.";
      if (!account.ownerName.trim()) return "Owner name is required.";
      if (!account.phone.trim()) return "Phone number is required.";
    } else if (step === 2) {
      if (!business.storeName.trim()) return "Store name is required.";
      if (!business.city.trim()) return "City is required.";
      if (!business.province.trim()) return "Province is required.";
    } else if (step === 3) {
      if (!cnic.number.trim()) return "CNIC number is required.";
      if (!cnicValid) return "CNIC must be in format #####-#######-# (13 digits).";
      if (!cnic.front) return "CNIC front image is required.";
      if (!cnic.back) return "CNIC back image is required.";
    } else if (step === 4) {
      if (!allImagesUploaded) return "All required verification images must be uploaded.";
    } else if (step === 5) {
      if (!video || !video.path) return "You must record a live camera verification video.";
    }
    return "";
  };

  const canProceed = () => {
    const err = stepValid();
    setError(err);
    return !err;
  };

  const applyAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/auth/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
          ownerName: account.ownerName,
          phone: account.phone,
          storeName: business.storeName,
          businessType: business.businessType,
          description: business.description,
          address: business.address,
          city: business.city,
          province: business.province,
          country: business.country,
          supportContact: business.supportContact,
          socialLinks: {
            instagram: business.instagram,
            facebook: business.facebook,
            tiktok: business.tiktok,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create your seller application.");
        return false;
      }
      setApplied(true);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!canProceed()) return;
    if (step === 2) {
      const ok = await applyAccount();
      if (!ok) return;
    }
    setError("");
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnicNumber: cnic.number,
          cnicFrontPath: cnic.front,
          cnicBackPath: cnic.back,
          images: VERIFICATION_IMAGE_DEFS.map((d) => ({
            key: d.key,
            label: d.label,
            path: images[d.key],
          })),
          liveVideoPath: video?.path,
          liveVideoDuration: video?.duration ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit verification.");
        return;
      }
      setSubmitted(true);
      setSuccess(
        "Your identity verification has been submitted and is now under review by our team."
      );
    } catch {
      setError("Network error submitting verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FiCheckCircle size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">Application Submitted</h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            {success} You will be notified once our team reviews your identity
            documents.
          </p>
          <button
            onClick={() => router.push("/seller/verification")}
            className="w-full h-11 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all mt-6"
          >
            View Verification Status
          </button>
        </div>
      </div>
    );
  }

  const buttonClass =
    "flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#FF6B35] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiShield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F]">Become a Seller</h1>
          <p className="text-sm text-gray-400 mt-1">
            Complete identity verification to start selling on FitCheck
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-xs text-gray-400">
              {applied ? "Application active" : "Registration"}
            </span>
          </div>
          <div className="flex items-center gap-1 mb-4">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step ? "bg-[#FF6B35]" : "bg-gray-100"
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step - 1;
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      current
                        ? "bg-[#FF6B35] text-white"
                        : done
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {done ? <FiCheckCircle size={15} /> : <s.icon size={15} />}
                  </div>
                  <span
                    className={`text-[10px] font-medium leading-none ${
                      current ? "text-[#FF6B35]" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
            <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <StepTitle
                icon={FiUser}
                title="Personal Information"
                subtitle="Your account details and contact information."
              />
              <Field label="Full Name (Owner)" icon={FiUser}>
                <input
                  value={account.ownerName}
                  onChange={(e) => updateAccount("ownerName", e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className={inputCls}
                />
              </Field>
              <Field label="Email" icon={FiMail}>
                <input
                  type="email"
                  value={account.email}
                  onChange={(e) => updateAccount("email", e.target.value)}
                  placeholder="seller@example.com"
                  className={inputCls}
                />
              </Field>
              <Field label="Password" icon={FiLock}>
                <input
                  type="password"
                  value={account.password}
                  onChange={(e) => updateAccount("password", e.target.value)}
                  placeholder="At least 6 characters"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone" icon={FiPhone}>
                <input
                  value={account.phone}
                  onChange={(e) => updateAccount("phone", e.target.value)}
                  placeholder="+92 300 1234567"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <StepTitle
                icon={FiGlobe}
                title="Business / Store Information"
                subtitle="Tell us about your store."
              />
              <Field label="Store Name" icon={FiGlobe}>
                <input
                  value={business.storeName}
                  onChange={(e) => updateBusiness("storeName", e.target.value)}
                  placeholder="My FitCheck Store"
                  className={inputCls}
                />
              </Field>
              <Field label="Business Type">
                <select
                  value={business.businessType}
                  onChange={(e) => updateBusiness("businessType", e.target.value)}
                  className={inputCls}
                >
                  <option value="dropshipping">Dropshipping</option>
                  <option value="physical_store">Physical Store</option>
                  <option value="brand">Brand / Manufacturer</option>
                  <option value="freelancer">Freelancer / Seller</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  value={business.description}
                  onChange={(e) => updateBusiness("description", e.target.value)}
                  placeholder="Describe your store and products…"
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Address" icon={FiMapPin}>
                  <input
                    value={business.address}
                    onChange={(e) => updateBusiness("address", e.target.value)}
                    placeholder="Street address"
                    className={inputCls}
                  />
                </Field>
                <Field label="City">
                  <input
                    value={business.city}
                    onChange={(e) => updateBusiness("city", e.target.value)}
                    placeholder="Lahore"
                    className={inputCls}
                  />
                </Field>
                <Field label="Province">
                  <input
                    value={business.province}
                    onChange={(e) => updateBusiness("province", e.target.value)}
                    placeholder="Punjab"
                    className={inputCls}
                  />
                </Field>
                <Field label="Country">
                  <select
                    value={business.country}
                    onChange={(e) => updateBusiness("country", e.target.value)}
                    className={inputCls}
                  >
                    <option value="Pakistan">Pakistan</option>
                  </select>
                </Field>
              </div>
              <Field label="Support Contact">
                <input
                  value={business.supportContact}
                  onChange={(e) => updateBusiness("supportContact", e.target.value)}
                  placeholder="Email or phone for support"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* STEP 3 - CNIC */}
          {step === 3 && (
            <div className="space-y-6">
              <StepTitle
                icon={FiFileText}
                title="CNIC / Identity Card Verification"
                subtitle="Upload your Computerized National Identity Card."
              />
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3 py-2.5">
                <FiShield className="mt-0.5 shrink-0" size={14} />
                <span>
                  Your CNIC documents are private and securely protected. They are
                  only accessible to you and authorized FitCheck admins.
                </span>
              </div>
              <Field label="CNIC Number">
                <input
                  value={cnic.number}
                  onChange={(e) => setCnic((p) => ({ ...p, number: e.target.value }))}
                  placeholder="#####-#######-#"
                  maxLength={15}
                  className={inputCls}
                />
                {cnic.number && !cnicValid && (
                  <p className="text-xs text-red-500 mt-1">
                    Enter 13 digits as #####-#######-#
                  </p>
                )}
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <VerificationImageUpload
                  label="CNIC Front Image"
                  help="Front side of your CNIC (photo side)."
                  kind="cnic"
                  value={cnic.front}
                  onChange={(p) => setCnic((prev) => ({ ...prev, front: p }))}
                />
                <VerificationImageUpload
                  label="CNIC Back Image"
                  help="Back side of your CNIC (address side)."
                  kind="cnic"
                  value={cnic.back}
                  onChange={(p) => setCnic((prev) => ({ ...prev, back: p }))}
                />
              </div>
            </div>
          )}

          {/* STEP 4 - Verification Images */}
          {step === 4 && (
            <div className="space-y-6">
              <StepTitle
                icon={FiImage}
                title="Required Verification Images"
                subtitle="Upload all required images to proceed."
              />
              <div className="space-y-6">
                {VERIFICATION_IMAGE_DEFS.map((def) => (
                  <VerificationImageUpload
                    key={def.key}
                    label={def.label}
                    help={def.help}
                    kind="verification_image"
                    value={images[def.key]}
                    onChange={(p) => setImages((prev) => ({ ...prev, [def.key]: p }))}
                  />
                ))}
              </div>
              <Checklist
                items={VERIFICATION_IMAGE_DEFS.map((d) => ({
                  label: d.label,
                  done: !!images[d.key],
                }))}
              />
            </div>
          )}

          {/* STEP 5 - Live Video */}
          {step === 5 && (
            <div className="space-y-6">
              <StepTitle
                icon={FiVideo}
                title="Live Video Verification"
                subtitle="Record a short verification video using your device camera."
              />
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3 py-2.5">
                <FiVideo className="mt-0.5 shrink-0" size={14} />
                <span>
                  Please record a clear verification video using your device
                  camera. Make sure your face is clearly visible, use good
                  lighting, and keep the camera steady.
                </span>
              </div>
              <ul className="space-y-1.5 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                <Instruction>Make sure your face is clearly visible</Instruction>
                <Instruction>Use good lighting</Instruction>
                <Instruction>Keep the camera steady</Instruction>
                <Instruction>Follow the instructions shown on screen</Instruction>
                <Instruction>Record the video directly using the live camera</Instruction>
              </ul>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <FiShield size={14} className="text-[#FF6B35]" />
                Note: you cannot upload an existing video — only live camera recording is allowed.
              </div>
              <LiveCameraRecorder
                onRecorded={(r) => setVideo({ path: r.path, duration: r.duration })}
                maxDurationSeconds={60}
              />
              <Checklist
                items={[{ label: "Live camera video recorded", done: !!video?.path }]}
              />
            </div>
          )}

          {/* STEP 6 - Review */}
          {step === 6 && (
            <div className="space-y-6">
              <StepTitle
                icon={FiShield}
                title="Review & Submit"
                subtitle="Confirm your details and submit for admin review."
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <ReviewBox title="Account">
                  <ReviewRow label="Owner" value={account.ownerName} />
                  <ReviewRow label="Email" value={account.email} />
                  <ReviewRow label="Phone" value={account.phone} />
                </ReviewBox>
                <ReviewBox title="Store">
                  <ReviewRow label="Store" value={business.storeName} />
                  <ReviewRow label="Type" value={business.businessType} />
                  <ReviewRow label="City" value={business.city} />
                </ReviewBox>
              </div>
              {/* Verification checklist */}
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <p className="text-sm font-bold text-[#1F1F1F] mb-2">
                  Verification Checklist
                </p>
                <Checklist
                  items={[
                    { label: "Identity Card (CNIC)", done: !!cnic.front && !!cnic.back },
                    { label: "Verification Images", done: allImagesUploaded },
                    { label: "Live Camera Video", done: !!video?.path },
                  ]}
                />
              </div>
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-3 py-2.5">
                <FiCheckCircle className="mt-0.5 shrink-0" size={14} />
                <span>
                  The three mandatory verification items are present. Your
                  application cannot be approved until a FitCheck admin verifies
                  all of them.
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className={`${buttonClass} border border-gray-200 text-gray-600 hover:bg-gray-50 ${
                step === 1 ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <FiArrowLeft size={16} /> Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className={`${buttonClass} bg-[#FF6B35] text-white hover:bg-[#e05a2b] disabled:opacity-60`}
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    {step === 2 ? "Create Application" : "Continue"} <FiArrowRight size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`${buttonClass} bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60`}
              >
                {loading ? <Spinner /> : (
                  <>
                    <FiCheckCircle size={16} /> Submit for Review
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already applied?{" "}
          <Link href="/seller/login" className="text-[#FF6B35] font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ---- small helpers ---- */

const inputCls =
  "w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all";

function StepTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center">
        <Icon size={20} className="text-[#FF6B35]" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#1F1F1F]">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-gray-400" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function Instruction({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <FiCheckCircle size={14} className="text-emerald-500" />
      {children}
    </li>
  );
}

function Checklist({
  items,
}: {
  items: { label: string; done: boolean }[];
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 space-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{it.label}</span>
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              it.done ? "text-emerald-500" : "text-gray-400"
            }`}
          >
            {it.done ? (
              <>
                <FiCheckCircle size={13} /> Submitted
              </>
            ) : (
              "Pending"
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReviewBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-[#1F1F1F]">
        {value || "—"}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}
