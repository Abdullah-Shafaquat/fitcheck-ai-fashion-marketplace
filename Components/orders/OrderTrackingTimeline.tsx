"use client";

import {
  FiCheckCircle,
  FiCircle,
  FiPackage,
  FiTruck,
  FiXCircle,
} from "react-icons/fi";
import {
  FULFILLMENT_TIMELINE,
  StatusHistoryEntry,
  normalizeOrderStatus,
} from "@/lib/orderWorkflow";

interface Props {
  status: string;
  statusHistory?: StatusHistoryEntry[];
  createdAt?: string;
}

function historyDateFor(
  history: StatusHistoryEntry[],
  step: string,
  createdAt?: string
): string | null {
  const entry = history.find((h) => normalizeOrderStatus(h.to) === step);
  if (entry?.at) return entry.at;
  if (step === "Pending" && createdAt) return createdAt;
  return null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STEP_ICONS: Record<string, typeof FiPackage> = {
  Pending: FiPackage,
  Confirmed: FiCheckCircle,
  Processing: FiPackage,
  Packed: FiPackage,
  Shipped: FiTruck,
  "Out for Delivery": FiTruck,
  Delivered: FiCheckCircle,
};

export default function OrderTrackingTimeline({ status, statusHistory = [], createdAt }: Props) {
  const norm = normalizeOrderStatus(status);
  const cancelled = norm === "Cancelled" || norm === "Refunded";
  const pendingCancel = norm === "Cancel Requested";
  const refundFlow = ["Refund Requested", "Refund Approved", "Refunded", "Refund Rejected"].includes(norm);

  if (cancelled) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
        <FiXCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">Order {norm}</p>
          <p className="text-xs text-red-500 mt-0.5">This order has been {norm.toLowerCase()}.</p>
        </div>
      </div>
    );
  }

  if (pendingCancel) {
    return (
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl p-4">
        <FiCircle size={20} className="text-violet-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-700">Cancellation Requested</p>
          <p className="text-xs text-violet-500 mt-0.5">
            The customer requested cancellation. It is awaiting review.
          </p>
        </div>
      </div>
    );
  }

  if (refundFlow) {
    return (
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <FiPackage size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-700">{norm}</p>
          <p className="text-xs text-blue-500 mt-0.5">
            Your refund is being processed. We will notify you of any updates.
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = FULFILLMENT_TIMELINE.findIndex((s) => s === norm);

  return (
    <div className="space-y-0">
      {FULFILLMENT_TIMELINE.map((step, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const isLast = i === FULFILLMENT_TIMELINE.length - 1;
        const Icon = STEP_ICONS[step] || FiCircle;
        const date = historyDateFor(statusHistory, step, createdAt);
        const labels: Record<string, string> = {
          Pending: "Order Placed",
          Confirmed: "Order Confirmed",
          Processing: "Processing",
          Packed: "Packed",
          Shipped: "Shipped",
          "Out for Delivery": "Out for Delivery",
          Delivered: "Delivered",
        };

        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? "bg-emerald-100 text-emerald-600"
                    : current
                      ? "bg-[#FF6B35]/10 text-[#FF6B35] ring-2 ring-[#FF6B35]/30"
                      : "bg-gray-100 text-gray-300"
                }`}
              >
                {done ? <FiCheckCircle size={16} /> : <Icon size={16} />}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[2rem] ${done ? "bg-emerald-200" : "bg-gray-200"}`} />
              )}
            </div>
            <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-semibold ${
                  done || current ? "text-[#1F1F1F]" : "text-gray-400"
                }`}
              >
                {labels[step] || step}
              </p>
              {date && (
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(date)}</p>
              )}
              {current && (
                <p className="text-xs font-medium text-[#FF6B35] mt-0.5">Current stage</p>
              )}
              {!done && !current && !date && (
                <p className="text-xs text-gray-300 mt-0.5">Pending</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
