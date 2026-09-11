"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/context/StoreContext";
import Link from "next/link";
import Image from "next/image";
import {
  IoCheckmarkCircle,
  IoLockClosedOutline,
  IoWarningOutline,
  IoShieldCheckmarkOutline,
  IoCardOutline,
  IoCashOutline,
  IoLocationOutline,
  IoWalletOutline,
  IoPhonePortraitOutline,
} from "react-icons/io5";

interface AlternateProvider {
  id: "jazzcash";
  label: string;
}

interface SavedAddress {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  label: string;
  line1: string;
  line2?: string | null;
  area?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault: boolean;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CheckoutPage() {
  const { cart, getCartTotal } = useStore();
  const [step, setStep] = useState<"info" | "payment" | "review">("info");
  const [reviewIssues, setReviewIssues] = useState<string[]>([]);
  const [reviewValidating, setReviewValidating] = useState(false);
  const [reviewSignature, setReviewSignature] = useState("");
  const [reviewPriceNotes, setReviewPriceNotes] = useState<
    Record<string, { old: number; new: number }>
  >({});
  const [paymentMethod, setPaymentMethod] = useState<
    "online" | "cod" | "jazzcash"
  >("online");
  const [alternateProviders, setAlternateProviders] = useState<AlternateProvider[]>([]);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const submitting = useRef(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    line2: "",
    area: "",
    city: "",
    state: "",
    zip: "",
    country: "Pakistan",
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);

  const applyAddress = useCallback((a: SavedAddress) => {
    setFormData({
      firstName: a.fullName || "",
      lastName: "",
      email: a.email,
      phone: a.phone || "",
      address: a.line1 || "",
      line2: a.line2 || "",
      area: a.area || "",
      city: a.city || "",
      state: a.province || "",
      zip: a.postalCode || "",
      country: a.country || "Pakistan",
    });
    setSelectedAddressId(a.id);
  }, []);

  useEffect(() => {
    let stored: { email?: string; name?: string } | null = null;
    try {
      const raw = localStorage.getItem("fitcheck-user");
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }
    const email = stored?.email?.trim().toLowerCase();
    if (!email) return;
    setUserEmail(email);
    setFormData((f) => ({ ...f, email }));
    fetch(`/api/addresses`)
      .then((r) => r.json())
      .then((data) => {
        const list: SavedAddress[] = data.addresses || [];
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) applyAddress(def);
      })
      .catch(() => {});
  }, [applyAddress]);

  useEffect(() => {
    fetch(`/api/payments/alternate`)
      .then((r) => r.json())
      .then((data) => setAlternateProviders(data.providers || []))
      .catch(() => {});
  }, []);

  const subtotal = getCartTotal();
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const goReview = () => {
    setStep("review");
  };

  const reviewLineKey = (it: { productId: string; size: string; color: string }) =>
    `${it.productId}::${it.size}::${it.color}`;

  const cartSig = cart
    .map((it) => `${it.productId}|${it.size}|${it.color}|${it.quantity}|${it.price}`)
    .sort()
    .join("&&");

  useEffect(() => {
    if (step !== "review") return;
    let cancelled = false;
    setReviewValidating(true);
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
        const issues: string[] = [];
        const prevPrices = new Map(cart.map((it) => [reviewLineKey(it), it.price]));
        const notes: Record<string, { old: number; new: number }> = {};
        interface Res {
          productId: string;
          size: string;
          color: string;
          name?: string;
          found?: boolean;
          price?: number;
          stock?: number;
          publiclyAvailable?: boolean;
          sizeAvailable?: boolean;
          colorAvailable?: boolean;
        }
        (data.results || []).forEach((r: Res) => {
          if (!r.found || r.publiclyAvailable === false) {
            issues.push(`${r.name || "An item"} is no longer available.`);
            return;
          }
          if (r.sizeAvailable === false || r.colorAvailable === false) {
            issues.push(`${r.name || "An item"} — this size/color is no longer available.`);
            return;
          }
          if ((r.stock ?? 0) <= 0) {
            issues.push(`${r.name || "An item"} is currently out of stock.`);
            return;
          }
          const prev = prevPrices.get(reviewLineKey(r));
          if (typeof prev === "number" && typeof r.price === "number" && prev !== r.price) {
            notes[reviewLineKey(r)] = { old: prev, new: r.price };
          }
        });
        setReviewIssues(issues);
        setReviewPriceNotes(notes);
        setReviewSignature(cartSig);
      } catch {
        // The server re-validates items again at order creation.
      } finally {
        if (!cancelled) setReviewValidating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const reviewDirty = step === "review" && cartSig !== reviewSignature;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || placing) return;
    submitting.current = true;
    setPlacing(true);
    setOrderError("");
    try {
      // Deterministic reference derived from the exact cart contents. Any cart
      // change yields a new reference, so an unpaid order is safely reused only
      // when the customer retries with the identical cart — never a duplicate
      // order for the same purchase, and never a mismatch with the stored items.
      const signatureInput = cart
        .map((it) => `${it.productId}|${it.size}|${it.color}|${it.quantity}|${it.price}`)
        .sort()
        .join("&&");
      const clientRef = await sha256(signatureInput);

      // Optionally persist this address to the customer's address book (only when
      // a logged-in user opted in and all required fields are present).
      if (saveToAccount && userEmail) {
        try {
          await fetch(`/api/addresses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: `${formData.firstName} ${formData.lastName}`.trim() || formData.email,
              phone: formData.phone,
              line1: formData.address,
              line2: formData.line2,
              area: formData.area,
              city: formData.city,
              province: formData.state,
              postalCode: formData.zip,
              country: formData.country,
            }),
          });
        } catch {
          // Non-critical: never block the purchase because saving an address failed.
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          clientRef,
          paymentMethod,
          shippingInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            line2: formData.line2,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            country: formData.country,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || "Failed to place order");
      }
      // Cash on Delivery: no redirect — go straight to the order confirmation.
      if (paymentMethod === "cod") {
        const orderUrl =
          data.orderUrl ||
          `/orders/${encodeURIComponent(data.order.orderNo)}?email=${encodeURIComponent(data.order.email || "")}`;
        window.location.assign(orderUrl);
        return;
      }
      if (!data.checkoutUrl) {
        throw new Error(
          data.error || "Payment could not be started. Please try again."
        );
      }
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setOrderError(
        err instanceof Error ? err.message : "Failed to place order. Please try again."
      );
      setPlacing(false);
      submitting.current = false;
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary mb-2">No items to checkout</h1>
          <p className="text-gray-400 text-sm mb-6">Add some products to your cart first.</p>
          <Link href="/shop" className="px-8 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <span className={`text-sm font-semibold ${step === "info" ? "text-primary" : "text-green-500"}`}>
            {step === "info" ? "1" : <IoCheckmarkCircle size={16} />}
          </span>
          <span className={`text-sm ${step === "info" ? "text-secondary font-semibold" : "text-gray-400"}`}>Shipping</span>
          <span className="w-12 h-px bg-gray-200 mx-1" />
          <span className={`text-sm font-semibold ${step === "payment" ? "text-primary" : "text-green-500"}`}>
            {step === "payment" ? "2" : <IoCheckmarkCircle size={16} />}
          </span>
          <span className={`text-sm ${step === "payment" ? "text-secondary font-semibold" : "text-gray-400"}`}>Payment</span>
          <span className="w-12 h-px bg-gray-200 mx-1" />
          <span className={`text-sm font-semibold ${step === "review" ? "text-primary" : "text-gray-300"}`}>3</span>
          <span className={`text-sm ${step === "review" ? "text-secondary font-semibold" : "text-gray-400"}`}>Review</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === "info" ? (
              <form onSubmit={handleSubmitInfo} className="bg-white rounded-3xl p-6 md:p-8 space-y-6 border border-gray-100 shadow-[var(--shadow-card)]">
                <div>
                  <p className="eyebrow-light mb-2">Delivery Details</p>
                  <h2 className="editorial-title text-2xl">Shipping Information</h2>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <IoLocationOutline className="text-primary" size={16} />
                      <p className="text-sm font-semibold text-secondary">Use a saved address</p>
                    </div>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => {
                        const a = savedAddresses.find((x) => x.id === e.target.value);
                        if (a) applyAddress(a);
                      }}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white"
                    >
                      <option value="">Select address…</option>
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.line1}, {a.city} {a.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setSelectedAddressId(""); }}
                      className="text-xs font-semibold text-primary hover:underline mt-2"
                    >
                      Enter a new address instead
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-firstName" className="text-xs font-medium text-gray-500 mb-1.5 block">First Name</label>
                    <input id="checkout-firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor="checkout-lastName" className="text-xs font-medium text-gray-500 mb-1.5 block">Last Name</label>
                    <input id="checkout-lastName" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-email" className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                    <input id="checkout-email" name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
                    <input id="checkout-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                </div>

                <div>
                  <label htmlFor="checkout-address" className="text-xs font-medium text-gray-500 mb-1.5 block">Address</label>
                  <input id="checkout-address" name="address" value={formData.address} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-line2" className="text-xs font-medium text-gray-500 mb-1.5 block">Apartment / Suite (optional)</label>
                    <input id="checkout-line2" name="line2" value={formData.line2} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor="checkout-area" className="text-xs font-medium text-gray-500 mb-1.5 block">Area (optional)</label>
                    <input id="checkout-area" name="area" value={formData.area} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="checkout-city" className="text-xs font-medium text-gray-500 mb-1.5 block">City</label>
                    <input id="checkout-city" name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor="checkout-state" className="text-xs font-medium text-gray-500 mb-1.5 block">State</label>
                    <input id="checkout-state" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                  <div>
                    <label htmlFor="checkout-zip" className="text-xs font-medium text-gray-500 mb-1.5 block">ZIP Code</label>
                    <input id="checkout-zip" name="zip" value={formData.zip} onChange={handleChange} required className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40" />
                  </div>
                </div>

                <div>
                  <label htmlFor="checkout-country" className="text-xs font-medium text-gray-500 mb-1.5 block">Country</label>
                  <select id="checkout-country" name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white">
                    <option>Pakistan</option>
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>UAE</option>
                  </select>
                </div>

                {userEmail && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToAccount}
                      onChange={(e) => setSaveToAccount(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-xs text-gray-500">
                      Save this address to my account for faster checkout next time.
                    </span>
                  </label>
                )}

                <button type="submit" className="w-full py-3.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all">
                  Continue to Payment
                </button>
              </form>
            ) : step === "payment" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goReview();
                }}
                className="bg-white rounded-3xl p-6 md:p-8 space-y-6 border border-gray-100 shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="eyebrow-light mb-2">Secure Checkout</p>
                  <h2 className="editorial-title text-2xl">Payment Method</h2>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Delivery Address
                      </p>
                      <p className="text-sm font-semibold text-secondary">
                        {formData.firstName} {formData.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formData.address}</p>
                      {formData.line2 && (
                        <p className="text-xs text-gray-500">{formData.line2}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {[formData.area, formData.city, formData.state].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500">{formData.country}</p>
                      <p className="text-xs text-gray-400 mt-1">{formData.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("info")}
                      className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
                    >
                      Change Address
                    </button>
                  </div>
                  {userEmail && savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddressPickerOpen((o) => !o)}
                      className="mt-3 text-xs font-semibold text-gray-500 hover:text-primary"
                    >
                      {addressPickerOpen ? "Hide saved addresses" : "Select another saved address"}
                    </button>
                  )}
                  {addressPickerOpen && savedAddresses.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {savedAddresses.map((a) => (
                        <label
                          key={a.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedAddressId === a.id
                              ? "border-primary bg-primary/5"
                              : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            checked={selectedAddressId === a.id}
                            onChange={() => applyAddress(a)}
                            className="mt-1 accent-primary"
                          />
                          <div>
                            <p className="text-sm font-semibold text-secondary">
                              {a.label} {a.isDefault && <span className="text-primary text-xs">(Default)</span>}
                            </p>
                            <p className="text-xs text-gray-500">
                              {a.line1}, {a.city}
                            </p>
                          </div>
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAddressId("");
                          setStep("info");
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        + Add New Address
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">How would you like to pay?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("online")}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                        paymentMethod === "online"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${paymentMethod === "online" ? "bg-primary/10" : "bg-gray-100"}`}>
                        <IoCardOutline size={22} className={paymentMethod === "online" ? "text-primary" : "text-gray-400"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-secondary">Pay Online</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                          Pay online via Safepay&apos;s secure checkout — cards &amp; local wallets (e.g. Easypaisa).
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                        paymentMethod === "cod"
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${paymentMethod === "cod" ? "bg-primary/10" : "bg-gray-100"}`}>
                        <IoCashOutline size={22} className={paymentMethod === "cod" ? "text-primary" : "text-gray-400"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-secondary">Cash on Delivery</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                          Pay in cash when your order is delivered to your door.
                        </p>
                      </div>
                    </button>
                    {alternateProviders.map((p) => {
                      const active = paymentMethod === p.id;
                      const iconBg = active ? "bg-primary/10" : "bg-gray-100";
                      const iconColor = active ? "text-primary" : "text-gray-400";
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaymentMethod(p.id)}
                          className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                            active
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            <IoPhonePortraitOutline size={22} className={iconColor} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-secondary">{p.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                              Pay directly with your JazzCash account on the secure JazzCash page.
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentMethod === "jazzcash" && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                    <div className="flex items-center gap-4 p-5 border-b border-emerald-100">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <IoShieldCheckmarkOutline size={24} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary">JazzCash</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          You&apos;ll pay securely on JazzCash&apos;s hosted page.
                        </p>
                      </div>
                    </div>
                    <div className="p-5 text-xs text-gray-500 leading-relaxed">
                      <p>
                        You will be redirected to{" "}
                        <span className="font-bold text-secondary">JazzCash</span>&apos;s
                        secure page to authorize the payment. Your order is confirmed once the payment
                        is verified.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === "online" ? (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Safepay secure hosted checkout — the single, trusted channel */}
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-gray-50/50">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <IoShieldCheckmarkOutline size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary">Safepay Secure Checkout</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          PCI-compliant hosted page. Card details never touch our servers.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                        Recommended
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        You will be redirected to Safepay&apos;s secure payment page where you can pay
                        using the method of your choice. The payment methods offered there (such as
                        Visa / Mastercard debit or credit cards, the Easypaisa wallet and other
                        bank-supported wallets) are the ones actually enabled and processed through
                        this store&apos;s Safepay merchant account. We never collect or store your card
                        number, CVV or expiry date.
                      </p>

                      {/* Informational chips — all processed on Safepay's hosted page, not locally */}
                      <div>
                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                          Available on Safepay&apos;s secure page
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {["Debit / Credit Cards", "Visa", "Mastercard", "Easypaisa", "Bank Wallets"].map(
                            (label) => (
                              <span
                                key={label}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5"
                              >
                                <IoCardOutline size={12} className="text-primary" />
                                {label}
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                          Actual methods shown depend on your Safepay account configuration.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-gray-50/50">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <IoCashOutline size={24} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary">Cash on Delivery</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          You pay in cash when your order arrives. No advance payment needed.
                        </p>
                      </div>
                    </div>
                    <div className="p-5 space-y-3 text-xs text-gray-500 leading-relaxed">
                      <p>
                        Your order will be delivered to your address and you pay the total of{" "}
                        <span className="font-bold text-secondary">Rs {total.toLocaleString()}</span>{" "}
                        in cash at your door. Please have the exact amount ready if possible.
                      </p>
                      <p>
                        Your items are reserved for you once you place the order. Our team will
                        contact you to confirm your delivery details.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("info")}
                    disabled={placing}
                    className="px-6 py-3.5 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <>
                      <IoCheckmarkCircle size={16} />
                      Continue to Review
                    </>
                  </button>
                </div>

                {orderError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <IoWarningOutline size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-600">
                        {paymentMethod === "cod" ? "Order could not be placed" : "Payment could not be started"}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">{orderError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <IoLockClosedOutline size={12} />
                  {paymentMethod === "cod" ? "No advance payment required" : paymentMethod === "jazzcash" ? "You will be redirected to the provider's secure page" : "Secured by Safepay"}
                </div>
              </form>
            ) : (
              <form onSubmit={handlePay} className="bg-white rounded-3xl p-6 md:p-8 space-y-6 border border-gray-100 shadow-[var(--shadow-card)]">
                <div>
                  <p className="eyebrow-light mb-2">Almost There</p>
                  <h2 className="editorial-title text-2xl">Review &amp; Confirm</h2>
                </div>

                {reviewValidating && (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl">
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Checking live stock &amp; prices...
                  </div>
                )}

                {!reviewValidating && reviewIssues.length > 0 && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <IoWarningOutline size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">Please fix before placing your order:</p>
                      <ul className="text-xs text-amber-700 mt-1 list-disc list-inside space-y-0.5">
                        {reviewIssues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-amber-600 mt-1.5">
                        Go back to your cart and remove the unavailable items to continue.
                      </p>
                    </div>
                  </div>
                )}

                {!reviewValidating && reviewDirty && (
                  <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <IoWarningOutline size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-orange-700">
                        Your cart changed after this review was prepared.
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        Head back and continue through checkout again to re-validate your items.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Items ({cart.reduce((n, it) => n + it.quantity, 0)})
                  </p>
                  <div className="divide-y divide-gray-100">
                    {cart.map((item) => {
                      const note = reviewPriceNotes[reviewLineKey(item)];
                      return (
                        <div key={reviewLineKey(item)} className="flex gap-3 py-3">
                          <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={item.image || "/images/placeholder.jpg"}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-secondary truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">
                              {item.size} / {item.color} &middot; Rs {item.price.toLocaleString()} each
                            </p>
                            {note && (
                              <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                                Price updated: Rs {note.new.toLocaleString()} (was Rs {note.old.toLocaleString()})
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-bold text-secondary self-center">
                            Rs {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <IoLocationOutline size={20} className="text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Delivery Address
                        </p>
                        <p className="text-sm font-semibold text-secondary">
                          {formData.firstName} {formData.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formData.address}</p>
                        {formData.line2 && <p className="text-xs text-gray-500">{formData.line2}</p>}
                        <p className="text-xs text-gray-500">
                          {[formData.area, formData.city, formData.state, formData.zip].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-xs text-gray-500">{formData.country}</p>
                        <p className="text-xs text-gray-400 mt-1">{formData.phone} &middot; {formData.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("info")}
                      disabled={placing}
                      className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
                    >
                      Change Address
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {paymentMethod === "cod" ? (
                          <IoCashOutline size={20} className="text-gray-400" />
                        ) : paymentMethod === "jazzcash" ? (
                          <IoWalletOutline size={20} className="text-gray-400" />
                        ) : (
                          <IoCardOutline size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Payment Method
                        </p>
                        <p className="text-sm font-semibold text-secondary">
                          {paymentMethod === "online"
                            ? "Pay Online (Safepay secure page)"
                            : paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : "JazzCash"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("payment")}
                      disabled={placing}
                      className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
                    >
                      Change Payment
                    </button>
                  </div>
                </div>

                {!!reviewPriceNotes && Object.keys(reviewPriceNotes).length > 0 && (
                  <p className="text-[11px] text-gray-400">
                    Totals below use the latest validated prices and will be re-checked when you place the order.
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? "text-green-500" : ""}>
                      {shipping === 0 ? "Free" : `Rs ${shipping.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-secondary">
                    <span>Total</span>
                    <span>Rs {total.toLocaleString()}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-[11px] text-gray-400">Free shipping on orders over Rs 5,000</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("payment")}
                    disabled={placing}
                    className="px-6 py-3.5 border border-gray-200 text-sm font-semibold text-secondary rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      placing ||
                      reviewValidating ||
                      reviewIssues.length > 0 ||
                      reviewDirty
                    }
                    className="flex-1 py-3.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {placing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {paymentMethod === "cod" ? "Placing your order..." : "Redirecting to payment..."}
                      </>
                    ) : (
                      <>
                        <IoLockClosedOutline size={16} />
                        {paymentMethod === "cod"
                          ? "Place Order (Pay on Delivery)"
                          : paymentMethod === "jazzcash"
                          ? "Pay with JazzCash"
                          : "Pay with Safepay"}
                      </>
                    )}
                  </button>
                </div>

                {orderError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <IoWarningOutline size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-600">
                        {paymentMethod === "cod" ? "Order could not be placed" : "Payment could not be started"}
                      </p>
                      <p className="text-xs text-red-500 mt-0.5">{orderError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <IoLockClosedOutline size={12} />
                  {paymentMethod === "cod"
                    ? "No advance payment required"
                    : paymentMethod === "jazzcash"
                    ? "Payments processed by the provider's secure page"
                    : "Secured by Safepay"}
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 sticky top-24 border border-gray-100 shadow-[var(--shadow-card)]">
              <h2 className="text-base font-bold text-secondary uppercase tracking-wide mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.size}-${item.color}`} className="flex gap-3">
                    <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={item.image || "/images/placeholder.jpg"}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-secondary truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.size} / {item.color}</p>
                      <p className="text-xs font-bold text-secondary mt-0.5">Rs {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>Rs {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? "text-green-500" : ""}>{shipping === 0 ? "Free" : `Rs ${shipping.toLocaleString()}`}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-secondary">
                  <span>Total</span>
                  <span>Rs {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
