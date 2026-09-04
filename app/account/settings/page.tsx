"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiBell,
  FiEye,
  FiEyeOff,
  FiLock,
  FiTrash2,
  FiArrowLeft,
  FiCheck,
  FiUser,
  FiAlertTriangle,
} from "react-icons/fi";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [promoNotifs, setPromoNotifs] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  const [profile, setProfile] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("fitcheck-user");
    if (!raw) router.push("/login?returnUrl=" + encodeURIComponent("/account/settings"));
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/profile");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProfile({
              name: data.user?.name || "",
              email: data.user?.email || "",
              phone: data.user?.phone || "",
            });
          }
        }
      } catch {
        /* ignore — profile section just won't populate */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setProfileBusy(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save profile.");
      setProfile(data.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setProfileBusy(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwBusy(true);
    setPwError("");
    setPwSaved(false);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password.");
      setShowPasswordModal(false);
      setCurrentPw("");
      setNewPw("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#FF6B35] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/account" className="hover:text-[#FF6B35] transition-colors">My Account</Link>
            <span>/</span>
            <span className="text-secondary font-medium">Settings</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF6B35] transition-colors mb-6"
          >
            <FiArrowLeft size={15} />
            Back to Account
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1F1F] tracking-tight mb-8">Settings</h1>

          {pwSaved && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 font-medium animate-in fade-in duration-200 flex items-center gap-2">
              <FiCheck size={16} />
              Password updated successfully!
            </div>
          )}

          <div className="space-y-6">
            {/* Profile */}
            {profile && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <FiUser size={18} className="text-[#FF6B35]" />
                  <h3 className="text-base font-bold text-[#1F1F1F]">Profile</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Full Name
                    </label>
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Phone
                    </label>
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-4 mb-2">Email: {profile.email}</p>

                {profileError && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <FiAlertTriangle size={13} />
                    {profileError}
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={profileBusy}
                  className="px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-95 disabled:opacity-60"
                >
                  {profileBusy ? "Saving…" : "Save Profile"}
                </button>
              </div>
            )}

            {/* Notification Preferences */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FiBell size={18} className="text-[#FF6B35]" />
                <h3 className="text-base font-bold text-[#1F1F1F]">Notification Preferences</h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: "Email notifications",
                    desc: "Order updates, delivery status, and account alerts",
                    checked: emailNotifs,
                    onChange: setEmailNotifs,
                  },
                  {
                    label: "SMS notifications",
                    desc: "Text messages for critical updates only",
                    checked: smsNotifs,
                    onChange: setSmsNotifs,
                  },
                  {
                    label: "Promotional emails",
                    desc: "New arrivals, sales, and exclusive offers",
                    checked: promoNotifs,
                    onChange: setPromoNotifs,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#1F1F1F]">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => item.onChange(!item.checked)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        item.checked ? "bg-[#FF6B35]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          item.checked ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <FiLock size={18} className="text-[#FF6B35]" />
                <h3 className="text-base font-bold text-[#1F1F1F]">Security</h3>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left group"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1F1F1F]">Change Password</p>
                    <p className="text-xs text-gray-400 mt-0.5">Update your password regularly for security</p>
                  </div>
                  <FiLock size={16} className="text-gray-300 group-hover:text-[#FF6B35] transition-colors" />
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl border border-red-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <FiTrash2 size={18} className="text-red-500" />
                <h3 className="text-base font-bold text-red-600">Danger Zone</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Permanently delete your account and all associated data.</p>
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="px-5 py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all active:scale-95"
              >
                Delete Account
              </button>
              {showDeleteConfirm && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 animate-in fade-in duration-200">
                  <p className="text-sm text-red-600 font-medium mb-2">Type <strong>DELETE</strong> to confirm:</p>
                  <div className="flex gap-2">
                    <input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
                    />
                    <button
                      disabled={deleteConfirmText !== "DELETE"}
                      className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1F1F1F] mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 transition-all"
                    />
                    <button
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      {showCurrentPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full px-4 py-3 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 transition-all"
                    />
                    <button
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      {showNewPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
                {pwError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <FiAlertTriangle size={13} />
                    {pwError}
                  </div>
                )}
              </div>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPwError("");
                }}
                disabled={pwBusy}
                className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors rounded-bl-2xl"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={!currentPw || !newPw || pwBusy}
                className="flex-1 py-3 text-sm font-semibold text-[#FF6B35] hover:text-[#e05a2b] border-l border-gray-100 transition-colors rounded-br-2xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pwBusy ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
