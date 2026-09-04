"use client";

import Image from "next/image";

export interface OrderItemView {
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  size?: string;
  color?: string;
}

interface Props {
  items: OrderItemView[];
  currency?: string;
  compact?: boolean;
}

export default function OrderItemsList({ items, currency = "PKR", compact }: Props) {
  const prefix = currency === "PKR" ? "PKR " : `${currency} `;

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const qty = Number(it.quantity) || 1;
        const unit = Number(it.price) || 0;
        const subtotal = unit * qty;
        return (
          <div
            key={`${it.productId || it.name}-${i}`}
            className={`flex gap-3 ${compact ? "" : "bg-gray-50 rounded-xl p-3"}`}
          >
            <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={it.image || "/images/placeholder.jpg"}
                alt={it.name || "Product"}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1F1F1F]">{it.name || "Product"}</p>
              {it.color && (
                <p className="text-xs text-gray-500 mt-0.5">Color: {it.color}</p>
              )}
              {it.size && (
                <p className="text-xs text-gray-500">Size: {it.size}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">Quantity: {qty}</p>
              <p className="text-xs text-gray-400 mt-1">
                {prefix}
                {unit.toLocaleString()} each
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-[#1F1F1F]">
                {prefix}
                {subtotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400">Subtotal</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
