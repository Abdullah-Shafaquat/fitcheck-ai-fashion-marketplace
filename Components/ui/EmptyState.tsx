import React from "react";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline";
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
}

/**
 * Consistent empty state: icon tile + heading + explanation + optional CTAs.
 * Use on every list/collection page with no data (products, orders, wishlist,
 * notifications, addresses, search results, etc.).
 */
export default function EmptyState({
  icon,
  title,
  description,
  actions = [],
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-14 sm:py-20 px-6 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-secondary sm:text-xl">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 mt-2 max-w-md">{description}</p>
      )}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          {actions.map((action, i) =>
            action.href ? (
              <LinkButton
                key={i}
                href={action.href}
                variant={action.variant}
                label={action.label}
              />
            ) : (
              <button
                key={i}
                onClick={action.onClick}
                className={
                  action.variant === "outline"
                    ? EMPTY_OUTLINE
                    : EMPTY_PRIMARY
                }
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

const EMPTY_PRIMARY =
  "w-full sm:w-auto px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all text-center";
const EMPTY_OUTLINE =
  "w-full sm:w-auto px-6 py-2.5 border border-primary text-primary text-sm font-semibold rounded-xl hover:bg-orange-50 transition-all text-center";

function LinkButton({
  href,
  variant,
  label,
}: {
  href: string;
  variant?: "primary" | "outline";
  label: string;
}) {
  return (
    <Link
      href={href}
      className={variant === "outline" ? EMPTY_OUTLINE : EMPTY_PRIMARY}
    >
      {label}
    </Link>
  );
}
