import React from "react";

export type StatTone = "emerald" | "purple" | "blue" | "primary" | "amber" | "red";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: StatTone;
  prefix?: string;
  href?: string;
  hint?: string;
}

const TONE_BG: Record<StatTone, string> = {
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  primary: "bg-[#FF6B35]",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

/**
 * Linkable stat card (icon tile + label + value). Mirrors the admin/seller
 * dashboard card pattern so every dashboard looks like one product.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  prefix = "",
  href,
  hint,
}: StatCardProps) {
  const inner = (
    <>
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${TONE_BG[tone]} opacity-[0.07] blur-2xl group-hover:opacity-[0.12] group-hover:scale-125 transition-all duration-500`}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-black text-[#1F1F1F] mt-1.5 tabular-nums">
            {prefix}
            {value.toLocaleString()}
          </p>
          {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
        </div>
        <div
          className={`w-12 h-12 rounded-2xl ${TONE_BG[tone]} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 text-white`}
        >
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-black/[0.04] hover:border-gray-200 transition-all duration-300 hover:-translate-y-0.5 block"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5">
      {inner}
    </div>
  );
}
