"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/context/StoreContext";
import Link from "next/link";
import Image from "next/image";
import EmptyState from "@/Components/ui/EmptyState";
import { IoTrashOutline, IoAddOutline, IoRemoveOutline, IoBagOutline, IoArrowBackOutline, IoWarningOutline, IoCheckmarkDoneOutline } from "react-icons/io5";

interface LiveStatus {
  productId: string;
  size: string;
  color: string;
  found?: boolean;
  name?: string;
  price?: number;
  oldPrice?: number | null;
  stock?: number;
  publiclyAvailable?: boolean;
  sizeAvailable?: boolean;
  colorAvailable?: boolean;
  canOrder?: boolean;
  reason?: string | null;
}

const lineKey = (it: { productId: string; size: string; color: string }) =>
  `${it.productId}::${it.size}::${it.color}`;

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    getCartTotal,
    getCartCount,
    clearCart,
    refreshCartPrices,
  } = useStore();

  const [statusMap, setStatusMap] = useState<Record<string, LiveStatus>>({});
  const [priceNotes, setPriceNotes] = useState<Record<string, { old: number; new: number }>>({});
  const [validating, setValidating] = useState(false);

  const cartKey = cart
    .map((it) => lineKey(it))
    .sort()
    .join("~~");

  useEffect(() => {
    let cancelled = false;
    if (cart.length === 0) {
      setStatusMap({});
      setPriceNotes({});
      setValidating(false);
      return;
    }
    setValidating(true);
    const prevPrices = new Map(cart.map((it) => [lineKey(it), it.price]));
    (async () => {
      try {
        const res = await fetch("/api/store/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((it) => ({
              productId: it.productId,
              size: it.size,
              color: it.color,
            })),
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        const map: Record<string, LiveStatus> = {};
        const notes: Record<string, { old: number; new: number }> = {};
        const updates: Record<
          string,
          { price: number; oldPrice?: number | null; stock: number }
        > = {};
        (data.results || []).forEach((r: LiveStatus) => {
          const key = lineKey(r);
          map[key] = r;
          if (r.found && r.publiclyAvailable && typeof r.price === "number") {
            const prev = prevPrices.get(key);
            if (typeof prev === "number" && prev !== r.price) {
              notes[key] = { old: prev, new: r.price };
            }
            updates[r.productId] = {
              price: r.price,
              oldPrice: r.oldPrice ?? null,
              stock: r.stock ?? 0,
            };
          }
        });
        setStatusMap(map);
        setPriceNotes(notes);
        if (Object.keys(updates).length > 0) refreshCartPrices(updates);
      } catch {
        // Non-critical: the server still re-validates at checkout and order creation.
      } finally {
        if (!cancelled) setValidating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  const subtotal = getCartTotal();
  const itemCount = getCartCount();
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;
  const savings = cart.reduce(
    (sum, item) => sum + Math.max(0, (item.oldPrice ?? 0) - item.price) * item.quantity,
    0
  );

  const invalidMessage = (item: (typeof cart)[number]): string | null => {
    const s = statusMap[lineKey(item)];
    if (!s) return null;
    if (!s.found || s.publiclyAvailable === false) return "This item is no longer available.";
    if (s.sizeAvailable === false || s.colorAvailable === false)
      return "This size/color is no longer available.";
    if ((s.stock ?? 0) <= 0) return "This item is currently out of stock.";
    return null;
  };

  const hasInvalid = cart.some((it) => invalidMessage(it));

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4">
          <EmptyState
            icon={<IoBagOutline size={28} />}
            title="Your Cart is Empty"
            description="Looks like you haven't added anything to your cart yet."
            actions={[{ label: "Continue Shopping", href: "/" }]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="editorial-title text-3xl md:text-4xl text-secondary mb-2">Shopping Cart</h1>
        <div className="rule-premium mb-8" />

        {validating && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl">
            <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Checking live stock &amp; prices...
          </div>
        )}

        {!validating && hasInvalid && (
          <div className="mb-6 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <IoWarningOutline size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Some items in your cart need your attention before you can check out. Please review
              the highlighted items below.
            </p>
          </div>
        )}

        {!validating && !hasInvalid && priceNotes && Object.keys(priceNotes).length > 0 && (
          <div className="mb-6 flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <IoCheckmarkDoneOutline size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              Prices updated to the latest values.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => {
              const invalid = invalidMessage(item);
              const note = priceNotes[lineKey(item)];
              return (
                <div
                  key={lineKey(item)}
                  className={`group bg-white rounded-2xl p-4 md:p-6 flex gap-4 md:gap-6 transition-all duration-500 ${
                    invalid
                      ? "border border-amber-200"
                      : "border border-transparent hover:border-gray-100 hover:shadow-[var(--shadow-card)]"
                  }`}
                >
                  <Link href={`/products/${item.slug}`} className="relative w-24 h-28 md:w-32 md:h-36 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 img-frame">
                    <Image
                      src={item.image || "/images/placeholder.jpg"}
                      alt={item.name}
                      fill
                      sizes="128px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.slug}`} className="text-sm font-semibold text-secondary hover:text-primary transition-colors line-clamp-1">
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">
                      Size: {item.size} &middot; Color: {item.color}
                    </p>
                    {item.sku && (
                      <p className="text-[11px] text-gray-300 font-mono mt-0.5">
                        SKU: {item.sku}
                      </p>
                    )}

                    {invalid ? (
                      <p className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                        <IoWarningOutline size={11} />
                        {invalid}
                      </p>
                    ) : (
                      note && (
                        <p className="text-[11px] font-semibold text-emerald-600 mt-2">
                          Price updated: Rs {note.new.toLocaleString()}
                        </p>
                      )
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                      <div className="flex items-center border border-gray-200 rounded-xl">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity - 1)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-secondary transition-colors"
                        >
                          <IoRemoveOutline size={14} />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-secondary">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.size, item.color, item.quantity + 1)}
                          disabled={item.quantity >= (item.stock ?? Number.MAX_SAFE_INTEGER)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-secondary transition-colors disabled:text-gray-200 disabled:cursor-not-allowed"
                        >
                          <IoAddOutline size={14} />
                        </button>
                      </div>
                      {typeof item.stock === "number" && item.stock > 0 && item.quantity >= item.stock && (
                        <p className="text-[11px] text-orange-500 mt-1">Max available stock reached</p>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm font-bold text-secondary whitespace-nowrap">
                            Rs {(item.price * item.quantity).toLocaleString()}
                          </span>
                          {item.oldPrice && item.oldPrice > item.price && (
                            <p className="text-[10px] text-gray-400 line-through text-right">
                              Rs {(item.oldPrice * item.quantity).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId, item.size, item.color)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <IoTrashOutline size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-4">
              <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
                <IoArrowBackOutline size={14} />
                Continue Shopping
              </Link>
              <button onClick={clearCart} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                Clear Cart
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 sticky top-24 shadow-[var(--shadow-card)] border border-gray-100">
              <h2 className="text-base font-bold text-secondary mb-4 uppercase tracking-wide">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="text-secondary font-medium">Rs {subtotal.toLocaleString()}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>You save</span>
                    <span className="text-emerald-500 font-medium">- Rs {savings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className={`font-medium ${shipping === 0 ? "text-green-500" : "text-secondary"}`}>
                    {shipping === 0 ? "Free" : `Rs ${shipping.toLocaleString()}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-400">Free shipping on orders over Rs 5,000</p>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-bold text-secondary">Total</span>
                  <span className="font-bold text-secondary text-lg">Rs {total.toLocaleString()}</span>
                </div>
              </div>

              {hasInvalid ? (
                <button
                  disabled
                  className="block w-full mt-6 py-3.5 bg-gray-300 text-white text-sm font-semibold text-center rounded-full cursor-not-allowed"
                >
                  Some items need attention
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="block w-full mt-6 py-3.5 btn-premium btn-premium-primary text-sm font-semibold text-center"
                >
                  Proceed to Checkout
                </Link>
              )}
              {hasInvalid && (
                <p className="mt-2 text-[11px] text-amber-600 text-center">
                  Remove unavailable items to continue.
                </p>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure checkout
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  30-day returns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}