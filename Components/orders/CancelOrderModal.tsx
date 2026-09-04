"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";
import { CANCELLATION_REASONS } from "@/lib/orderWorkflow";

interface Props {
  orderNo: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => Promise<void>;
  variant?: "customer" | "admin";
}

export default function CancelOrderModal({
  orderNo,
  open,
  onClose,
  onConfirm,
  variant = "customer",
}: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a cancellation reason.");
      return;
    }
    if (reason === "Other" && !details.trim()) {
      setError("Please explain your reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason, details.trim());
      setReason("");
      setDetails("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#1F1F1F]">Cancel Order #{orderNo}?</h3>
            <p className="text-xs text-gray-400 mt-1">
              {variant === "customer"
                ? "Our team will review your cancellation request. You'll be notified once it's approved."
                : "This action cannot be undone."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        <label className="text-xs font-medium text-gray-500 mb-1.5 block">
          Cancellation Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20"
        >
          <option value="">Select reason…</option>
          {CANCELLATION_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {reason === "Other" && (
          <>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Explain reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 resize-none"
              placeholder="Please provide details…"
            />
          </>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50"
          >
            Keep Order
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-3 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-60"
          >
            {busy
              ? variant === "customer"
                ? "Submitting…"
                : "Cancelling…"
              : variant === "customer"
                ? "Request Cancellation"
                : "Cancel Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
