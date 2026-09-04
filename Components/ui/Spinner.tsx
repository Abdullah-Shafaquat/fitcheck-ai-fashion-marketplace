import React from "react";

interface SpinnerProps {
  label?: string;
  className?: string;
  size?: number;
}

/**
 * Branded loading spinner (orange ring on neutral track). Replaces the
 * many hand-rolled `animate-spin` loaders across admin/seller/account.
 */
export default function Spinner({
  label,
  className = "",
  size = 56,
}: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="status"
        aria-live="polite"
        aria-label={label || "Loading"}
      >
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
        <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
      {label && (
        <p className="text-sm text-gray-400 font-medium mt-4">{label}</p>
      )}
    </div>
  );
}
