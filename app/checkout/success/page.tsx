"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import Link from "next/link";
import OrderReceipt from "@/Components/Receipt/OrderReceipt";
import {
  IoCheckmarkCircle,
  IoWarningOutline,
  IoCloseCircleOutline,
  IoHourglassOutline,
} from "react-icons/io5";

interface OrderItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
  image?: string;
  sku?: string | null;
}

interface Order {
  orderNo: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount?: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items?: OrderItem[];
  email?: string;
  customer?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  transactionId?: string | null;
  paymentReference?: string | null;
  paymentProvider?: string;
  createdAt?: string;
}

type Result =
  | { kind: "loading" }
  | { kind: "paid"; order: Order }
  | { kind: "failed"; order: Order; error?: string }
  | { kind: "cancelled"; order: Order }
  | { kind: "pending"; order: Order; error?: string }
  | { kind: "missing" };

// Safepay appends its tracker to our redirect URL. Depending on the provider it
// arrives either as a real `tracker` param or gets rolled into the `order`
// value (e.g. "FC-123?...&tracker=track_x" ends up as "FC-123?tracker=track_x").
// Recover it from either shape.
function trackerFromRaw(raw: string): string {
  const match = raw.match(/[?&#]tracker=([^&#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const rawOrder = searchParams.get("order") || searchParams.get("orderNo") || "";
  const orderNo = rawOrder.split(/[?&#]/)[0].trim();
  const trackerParam =
    (searchParams.get("tracker") || "").trim() || trackerFromRaw(rawOrder);
  const { removePurchasedItems } = useStore();
  const [result, setResult] = useState<Result>(() =>
    orderNo ? { kind: "loading" } : { kind: "missing" }
  );
  const cleaned = useRef(false);

  useEffect(() => {
    if (!orderNo) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        let order: Order | undefined;
        let tracker = trackerParam || undefined;

        // Some providers don't append a tracker, so fall back to fetching the
        // order first — that endpoint enforces ownership (session or ?email=).
        if (!tracker) {
          const orderRes = await fetch(`/api/orders/${encodeURIComponent(orderNo)}`);
          if (!orderRes.ok) throw new Error("not found");
          order = (await orderRes.json()).order as Order | undefined;
          if (!order) {
            setResult({ kind: "missing" });
            return;
          }
          tracker = order.transactionId || undefined;
        }

        const applyStatus = (status: string, resolved: Order, error?: string) => {
          if (status === "PAID") {
            if (!cleaned.current && resolved.items && resolved.items.length) {
              cleaned.current = true;
              removePurchasedItems(
                resolved.items.map((it) => ({
                  productId: it.productId || "",
                  size: it.size || "",
                  color: it.color || "",
                  quantity: it.quantity || 1,
                }))
              );
            }
            setResult({ kind: "paid", order: resolved });
          } else if (status === "CANCELLED") {
            setResult({ kind: "cancelled", order: resolved });
          } else if (status === "FAILED") {
            setResult({ kind: "failed", order: resolved, error });
          } else {
            setResult({ kind: "pending", order: resolved, error });
          }
        };

        const showWithoutTracking = async () => {
          // No tracker available yet — resolve via the ownership-checked lookup.
          if (!order) {
            const orderRes = await fetch(`/api/orders/${encodeURIComponent(orderNo)}`);
            if (!orderRes.ok) {
              setResult({ kind: "missing" });
              return;
            }
            order = (await orderRes.json()).order as Order | undefined;
          }
          if (!order) {
            setResult({ kind: "missing" });
            return;
          }
          applyStatus(order.paymentStatus === "PAID" ? "PAID" : "PENDING", order);
        };

        if (!tracker) {
          await showWithoutTracking();
          return;
        }

        // The verify endpoint authenticates via the payment tracker itself (no
        // customer session needed), so guest checkouts can still confirm here.
        const verifyRes = await fetch(
          `/api/orders/${encodeURIComponent(orderNo)}/verify`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tracker }),
          }
        );

        if (!verifyRes.ok) {
          // Tracker didn't match this order (or unknown order). Fall back to the
          // ownership-checked lookup so a logged-in customer can still resolve.
          await showWithoutTracking();
          return;
        }

        const verifyData = await verifyRes.json();
        const resolved: Order | undefined = verifyData?.order || order;
        if (!resolved) {
          setResult({ kind: "missing" });
          return;
        }
        const status: string =
          verifyData?.status ||
          (resolved.paymentStatus === "PAID" ? "PAID" : "PENDING");
        applyStatus(status, resolved, verifyData?.error);
      } catch {
        if (!cancelled) setResult({ kind: "missing" });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [orderNo, trackerParam, removePurchasedItems]);

  const renderLoading = () => (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-secondary mb-2">Verifying your payment</h1>
        <p className="text-gray-400 text-sm">Please wait, this may take a few seconds...</p>
      </div>
    </div>
  );

  const actionClass =
    "px-8 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all text-center inline-flex items-center justify-center";

  if (result.kind === "loading") return renderLoading();

  if (result.kind === "missing") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoWarningOutline size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Order not found</h1>
          <p className="text-gray-400 text-sm mb-8">
            We couldn&apos;t find that order. Please check your order number and try again.
          </p>
          <Link href="/shop" className={actionClass}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const order = result.order;
  const amountLabel = `Rs ${(order.total || 0).toLocaleString()}`;

  if (result.kind === "failed") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoCloseCircleOutline size={44} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Payment Failed</h1>
          <p className="text-gray-400 text-sm mb-2">Your payment could not be completed.</p>
          {order.orderNo && (
            <div className="mx-auto max-w-xs mb-4 bg-gray-50 border border-gray-100 rounded-xl py-3 px-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Order Number</p>
              <p className="text-sm font-black text-secondary font-mono tracking-wide">{order.orderNo}</p>
              <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mt-2 mb-0.5">Payment Status</p>
              <p className="text-xs font-bold text-red-500">FAILED</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className={actionClass}>Try Again</Link>
            <Link href="/cart" className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center">
              Return to Cart
            </Link>
            <Link href="/shop" className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result.kind === "cancelled") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <IoCloseCircleOutline size={44} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Payment Cancelled</h1>
          <p className="text-gray-400 text-sm mb-2">
            Your payment was cancelled. No charge was made and your order has not been confirmed.
          </p>
          {order.orderNo && (
            <div className="mx-auto max-w-xs mb-4 bg-gray-50 border border-gray-100 rounded-xl py-3 px-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Order Number</p>
              <p className="text-sm font-black text-secondary font-mono tracking-wide">{order.orderNo}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-2 mb-0.5">Payment Status</p>
              <p className="text-xs font-bold text-gray-500">CANCELLED</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className={actionClass}>Try Again</Link>
            <Link href="/cart" className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center">
              Return to Cart
            </Link>
            <Link href="/shop" className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center">
              Continue Shopping
            </Link>
          </div>
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
          <p className="text-gray-400 text-sm mb-6">
            {result.error || "We are still confirming your payment. It may take a few moments. Please refresh in a minute or check your order history."}
          </p>
          <div className="flex flex-col gap-3 justify-center">
            <button onClick={() => location.reload()} className={actionClass}>
              Refresh Status
            </button>
            <Link href="/shop" className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl">
        <div className="print:hidden text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <IoCheckmarkCircle size={44} className="text-green-500" />
          </div>
          <p className="eyebrow-light mb-2">Order Confirmed</p>
          <h1 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem]">Payment Successful</h1>
          <p className="text-gray-500 text-sm mt-2">
            Thank you for your purchase! Your order has been confirmed.
          </p>
          <div className="inline-flex items-center gap-6 mt-4 bg-white border border-gray-100 rounded-2xl px-6 py-3">
            <div className="text-left">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Order Number</p>
              <p className="text-sm font-black text-secondary font-mono tracking-wide">{order.orderNo}</p>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-left">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Amount Paid</p>
              <p className="text-sm font-black text-secondary">{amountLabel}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              href={`/track-order?orderNo=${encodeURIComponent(order.orderNo)}&email=${encodeURIComponent(
                order.email || ""
              )}`}
              className="px-8 py-3 border-2 border-[#FF6B35] text-[#FF6B35] text-sm font-semibold rounded-xl hover:bg-[#FF6B35]/5 transition-all text-center"
            >
              Track Your Order
            </Link>
            <Link
              href={`/orders/${encodeURIComponent(order.orderNo)}?email=${encodeURIComponent(
                order.email || ""
              )}`}
              className={actionClass}
            >
              View Order
            </Link>
            <Link
              href="/shop"
              className="px-8 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <OrderReceipt order={{ ...order, date: order.createdAt }} />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
