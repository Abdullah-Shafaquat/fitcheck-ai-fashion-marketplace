"use client";

import Image from "next/image";
import { useRef } from "react";
import { FiDownload, FiPrinter } from "react-icons/fi";

export interface ReceiptItem {
  name?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
  sku?: string | null;
  image?: string;
}

export interface ReceiptOrder {
  orderNo: string;
  date?: string;
  customer?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  items?: ReceiptItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  currency: string;
  status?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  transactionId?: string | null;
  paymentReference?: string | null;
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function rs(value: number | undefined) {
  return `Rs ${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatPaymentMethod(provider?: string) {
  const raw = (provider || "SAFEPAY").trim();
  if (raw.includes("·")) {
    const method = raw.split("·")[1]?.trim();
    return method ? `Safepay · ${method}` : raw;
  }
  return raw;
}

export default function OrderReceipt({
  order,
  showActions = true,
}: {
  order: ReceiptOrder;
  showActions?: boolean;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const print = () => {
    document.body.classList.add("printing-receipt");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-receipt"), 300);
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((n, it) => n + (Number(it.quantity) || 1), 0);

  return (
    <>
      {showActions && (
        <div className="print:hidden flex flex-col sm:flex-row gap-3">
          <button
            onClick={print}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all"
          >
            <FiDownload size={16} />
            Download Receipt
          </button>
          <button
            onClick={print}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all"
          >
            <FiPrinter size={16} />
            Print
          </button>
        </div>
      )}

      {/* Printable receipt */}
      <div className="print-area print:block print:mt-0" aria-label="FitCheck order receipt">
        <div
          ref={receiptRef}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden print:border-0 print:rounded-none print:shadow-none"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/top-logo.png"
                alt="FitCheck"
                width={44}
                height={44}
                className="rounded-lg object-contain"
                priority
              />
              <div>
                <span className="text-2xl font-extrabold tracking-tighter text-[#1F1F1F]">
                  FIT<span className="text-primary">CHECK</span>
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">Fashion Forward · Karachi, Pakistan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Receipt</p>
              <p className="text-sm font-black text-[#1F1F1F] font-mono">{order.orderNo}</p>
              <p className="text-[11px] text-gray-400">{formatDate(order.date)}</p>
            </div>
          </div>

          {/* Meta blocks */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1.5">Billed To</p>
              <p className="text-sm font-semibold text-[#1F1F1F]">{order.customer || "—"}</p>
              {order.email && <p className="text-xs text-gray-500 mt-0.5">{order.email}</p>}
              {order.phone && <p className="text-xs text-gray-500 mt-0.5">{order.phone}</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {[order.address, order.city, order.zip, order.country].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1.5">Payment</p>
              <p className="text-sm font-semibold text-[#1F1F1F]">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (order.paymentStatus || "").toUpperCase() === "PAID"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {order.paymentStatus || "PENDING"}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                Method · {formatPaymentMethod(order.paymentProvider)}
              </p>
              {order.transactionId && (
                <p className="text-xs text-gray-500 mt-0.5 break-all">Ref · {order.transactionId}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price</th>
                    <th className="py-2 pl-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded-md bg-gray-50 overflow-hidden flex-shrink-0 relative">
                            {it.image ? (
                              <Image src={it.image} alt={it.name || "item"} fill sizes="40px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-100" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1F1F1F] truncate">{it.name || "Item"}</p>
                            <p className="text-[11px] text-gray-400">
                              {[it.size, it.color].filter(Boolean).join(" · ")}
                              {it.sku ? ` · SKU ${it.sku}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-sm text-gray-600">{Number(it.quantity) || 1}</td>
                      <td className="py-3 px-2 text-right text-sm text-gray-600">{rs(it.price)}</td>
                      <td className="py-3 pl-2 text-right text-sm font-semibold text-[#1F1F1F]">
                        {rs((Number(it.price) || 0) * (Number(it.quantity) || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="px-6 py-5">
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{rs(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{order.shipping ? rs(order.shipping) : "FREE"}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>− {rs(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-[#1F1F1F] border-t border-gray-100 pt-2 mt-2">
                  <span>Total ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
                  <span>{rs(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 print:bg-white">
            <p className="text-[11px] text-gray-400 text-center">
              Thank you for shopping with FitCheck. Questions about this order? Contact us at
              support@fitcheck.com · +92 300 0000000
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
