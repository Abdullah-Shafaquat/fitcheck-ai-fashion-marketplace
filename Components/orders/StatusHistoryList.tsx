"use client";

import { StatusHistoryEntry } from "@/lib/orderWorkflow";

interface Props {
  history: StatusHistoryEntry[];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StatusHistoryList({ history }: Props) {
  if (!history.length) {
    return <p className="text-xs text-gray-400">No status changes recorded yet.</p>;
  }

  const sorted = [...history].reverse();

  return (
    <div className="space-y-3">
      {sorted.map((entry, i) => (
        <div key={`${entry.at}-${i}`} className="flex gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-[#FF6B35] mt-1.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-[#1F1F1F]">
              {entry.from ? `${entry.from} → ${entry.to}` : entry.to}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Changed by {entry.changedBy === "admin" ? "Admin" : entry.changedBy}
              {" · "}
              {formatDateTime(entry.at)}
            </p>
            {entry.note && (
              <p className="text-xs text-gray-500 mt-0.5">{entry.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
