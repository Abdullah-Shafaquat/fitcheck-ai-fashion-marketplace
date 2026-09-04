"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IoAlertCircleOutline, IoRefreshOutline, IoHomeOutline, IoStorefrontOutline } from "react-icons/io5";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FitCheck error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-white px-4 py-16">
      <div className="text-center max-w-md mx-auto">
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35] to-[#1F1F1F] rounded-3xl rotate-6 opacity-20" />
          <div className="relative w-24 h-24 bg-[#1F1F1F] rounded-3xl flex items-center justify-center shadow-xl shadow-black/20">
            <IoAlertCircleOutline size={44} className="text-[#FF6B35]" />
          </div>
          <span className="absolute -top-2 -right-2 w-8 h-8 bg-[#FF6B35] rounded-full flex items-center justify-center text-white text-sm font-black shadow-lg">
            !
          </span>
        </div>

        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#FF6B35] mb-3">
          Something went wrong
        </p>
        <h1 className="text-3xl font-black text-[#1F1F1F] mb-3 tracking-tight">
          This page hit a snag
        </h1>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          An unexpected error occurred while rendering this page. Our team has
          been notified — try again, or head back to the runway.
        </p>

        {error?.digest && (
          <p className="text-[10px] font-mono text-gray-300 mb-8 bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 inline-block">
            Error digest: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3.5 bg-[#FF6B35] text-white text-sm font-bold rounded-xl hover:bg-[#FF6B35]/90 hover:shadow-lg hover:shadow-[#FF6B35]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <IoRefreshOutline size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 px-6 py-3.5 border border-gray-200 text-sm font-bold text-[#1F1F1F] rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <IoHomeOutline size={16} />
            Go Home
          </Link>
        </div>

        <Link
          href="/shop"
          className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#FF6B35] transition-colors"
        >
          <IoStorefrontOutline size={14} />
          Or browse the latest drops
        </Link>
      </div>
    </div>
  );
}