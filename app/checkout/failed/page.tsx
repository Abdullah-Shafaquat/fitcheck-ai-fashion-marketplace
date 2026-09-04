"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  IoCloseCircleOutline,
  IoWarningOutline,
  IoHourglassOutline,
} from "react-icons/io5";

interface Order {
  orderNo: string;
  total: number;
  paymentStatus: string;
  status: string;
}

type Result =
  | { kind: "loading" }
  | { kind: "failed"; order: Order }
  | { kind: "cancelled"; order: Order }
  | { kind: "pending"; order: Order; error?: string }
  | { kind: "missing" };

function CheckoutFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNo = (searchParams.get("order") || "").split(/[?&#]/)[0].trim();
  const [result, setResult] = useState<Result>(() =>
    orderNo ? { kind: "loading" } : { kind: "missing" }
  );

  useEffect(() => {
    if (!orderNo) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const orderRes = await fetch(`/api/orders/${encodeURIComponent(orderNo)}`);
        if (!orderRes.ok) throw new Error("not found");
        const orderData = await orderRes.json();
        const order: Order | undefined = orderData.order;
        if (!order) {
          setResult({ kind: "missing" });
          return;
        }
        const tracker = (order as Order & { transactionId?: string | null }).transactionId;
        let status: string = order.paymentStatus || "PENDING";
        if (tracker) {
          const verifyRes = await fetch(
            `/api/orders/${encodeURIComponent(orderNo)}/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tracker }),
            }
          );
          const verifyData = await verifyRes.json();
          status = verifyData?.status || status;
          if (verifyData?.order) {
            order.paymentStatus = verifyData.order.paymentStatus || order.paymentStatus;
          }
        }
        if (status === "CANCELLED") setResult({ kind: "cancelled", order });
        else if (status === "FAILED") setResult({ kind: "failed", order });
        else if (status === "PAID") {
          router.replace(`/checkout/success?order=${encodeURIComponent(orderNo)}`);
          return;
        } else setResult({ kind: "pending", order });
      } catch {
        if (!cancelled) setResult({ kind: "missing" });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [orderNo, router]);

  const actionClass =
    "px-7 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all text-center inline-flex items-center justify-center";
  const outlineClass =
    "px-7 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center";

  if (result.kind === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-secondary mb-2">Checking payment status</h1>
        </div>
      </div>
    );
  }

  if (result.kind === "missing") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoWarningOutline size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Order not found</h1>
          <p className="text-gray-400 text-sm mb-8">We couldn&apos;t find that order.</p>
          <Link href="/shop" className={actionClass}>Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (result.kind === "pending") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoHourglassOutline size={40} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Payment Pending</h1>
          <p className="text-gray-400 text-sm mb-6">Your payment is still being confirmed. Please refresh in a moment or check your order history.</p>
          <div className="flex flex-col gap-3 justify-center">
            <button onClick={() => location.reload()} className={actionClass}>Refresh Status</button>
            <Link href="/shop" className={outlineClass}>Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const order = result.order;
  const isCancelled = result.kind === "cancelled";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCancelled ? "bg-gray-100" : "bg-red-100"}`}>
          <IoCloseCircleOutline size={44} className={isCancelled ? "text-gray-400" : "text-red-500"} />
        </div>
        <h1 className="text-2xl font-bold text-secondary mb-2">
          {isCancelled ? "Payment Cancelled" : "Payment Failed"}
        </h1>
        <p className="text-gray-400 text-sm mb-2">
          {isCancelled
            ? "Your payment was cancelled. No charge was made and your order has not been confirmed."
            : "Your payment could not be completed."}
        </p>
        {order.orderNo && (
          <div className="mx-auto max-w-xs mb-4 bg-gray-50 border border-gray-100 rounded-xl py-3 px-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Order Number</p>
            <p className="text-sm font-black text-secondary font-mono tracking-wide">{order.orderNo}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-2 mb-0.5">Payment Status</p>
            <p className="text-xs font-bold text-red-500">{isCancelled ? "CANCELLED" : "FAILED"}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/checkout" className={actionClass}>Try Again</Link>
          <Link href="/cart" className={outlineClass}>Return to Cart</Link>
          <Link href="/shop" className={outlineClass}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CheckoutFailedContent />
    </Suspense>
  );
}
