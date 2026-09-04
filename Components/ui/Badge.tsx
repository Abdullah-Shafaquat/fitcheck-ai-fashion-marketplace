import React from "react";

export type BadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  primary: "bg-[#FF6B35]/10 text-[#FF6B35]",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
  neutral: "bg-gray-100 text-gray-600",
};

/**
 * Shared status badge. Tone-based, uppercase micro-label. Matches the
 * light admin/seller surface (white cards on gray shell).
 */
export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
