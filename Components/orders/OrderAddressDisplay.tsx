"use client";

import { FiMapPin } from "react-icons/fi";
import {
  parseAddressSnapshot,
  formatAddressLines,
  AddressSnapshot,
} from "@/lib/orderWorkflow";

interface Props {
  addressSnapshot?: unknown;
  fallback?: {
    customer?: string;
    phone?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  title?: string;
}

export default function OrderAddressDisplay({
  addressSnapshot,
  fallback,
  title = "Delivery Address",
}: Props) {
  const snapshot: AddressSnapshot | null = parseAddressSnapshot(addressSnapshot);
  const lines = formatAddressLines(snapshot, fallback);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <FiMapPin size={14} className="text-[#FF6B35]" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
      </div>
      {snapshot?.label && (
        <p className="text-xs font-semibold text-[#FF6B35] mb-1">{snapshot.label}</p>
      )}
      <div className="space-y-0.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-[#1F1F1F]">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
