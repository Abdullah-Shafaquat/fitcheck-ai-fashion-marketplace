import React from "react";

interface SkeletonProps {
  className?: string;
}

/**
 * Pulsing placeholder block (light-surface tone). Use for loading states
 * instead of generic spinners.
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
    />
  );
}

interface TextSkeletonProps {
  className?: string;
  lines?: number;
}

/** A stacked set of text-shaped skeleton lines, e.g. for an info card. */
export function TextSkeleton({ className = "", lines = 3 }: TextSkeletonProps) {
  const widths = ["w-1/2", "w-3/4", "w-2/3", "w-4/5", "w-1/3", "w-3/5"];
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
}

/** Skeleton grid of product-image cards, mirroring the shop grid. */
export function ProductGridSkeleton({ count = 6 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[3/4] rounded-xl sm:rounded-2xl" />
          <div className="mt-2 sm:mt-3 space-y-1.5 px-0.5 sm:px-1">
            <Skeleton className="h-2.5 sm:h-3 w-1/2" />
            <Skeleton className="h-3 sm:h-4 w-3/4" />
            <Skeleton className="h-2.5 sm:h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

/** Skeleton for a table body with the given row/column count. */
export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full">
      <div className="border-b border-gray-100 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="py-4 flex gap-6 border-b border-gray-50/60">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-4 flex-1 ${j === 0 ? "w-1/2 flex-none" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
