"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountResetPasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    let user: { email?: string } | null = null;
    try {
      const raw = localStorage.getItem("fitcheck-user");
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }
    if (!user?.email) {
      router.replace("/login?returnUrl=" + encodeURIComponent("/account/reset-password"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password.");

      const updated = { ...user, forcePasswordReset: false };
      localStorage.setItem("fitcheck-user", JSON.stringify(updated));
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-xl font-bold mb-1">Create New Password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your administrator requires you to set a new password before continuing.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm border rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 text-sm border rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 text-sm border rounded-xl"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-60"
          >
            {busy ? "Saving…" : "Update Password"}
          </button>
          <Link href="/login" className="block text-center text-xs text-gray-400 hover:text-primary">
            Sign out and use a different account
          </Link>
        </form>
      </div>
    </div>
  );
}
