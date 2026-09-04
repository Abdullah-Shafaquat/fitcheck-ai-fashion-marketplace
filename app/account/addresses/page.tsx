"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiMapPin,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiHome,
  FiBriefcase,
  FiChevronLeft,
} from "react-icons/fi";

interface UserData {
  name: string;
  email: string;
  provider: string;
  image?: string | null;
}

interface Address {
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

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  label: "Home",
  line1: "",
  line2: "",
  area: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Pakistan",
};

export default function AddressesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/addresses");
    const data = await res.json();
    setAddresses(data.addresses || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let stored: UserData | null = null;
    try {
      const raw = localStorage.getItem("fitcheck-user");
      stored = raw ? (JSON.parse(raw) as UserData) : null;
    } catch {
      stored = null;
    }
    if (!stored) {
      router.replace("/login?returnUrl=" + encodeURIComponent("/account/addresses"));
      return;
    }
    setUser(stored);
    load();
  }, [router, load]);

  const startAdd = () => {
    setEditingId("");
    setForm({ ...EMPTY_FORM, fullName: user?.name || "", phone: "" });
    setError("");
  };

  const startEdit = (a: Address) => {
    setEditingId(a.id);
    setForm({
      fullName: a.fullName,
      phone: a.phone,
      label: a.label,
      line1: a.line1,
      line2: a.line2 || "",
      area: a.area || "",
      city: a.city,
      province: a.province || "",
      postalCode: a.postalCode || "",
      country: a.country,
    });
    setError("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError("");
    if (!form.fullName || !form.phone || !form.line1 || !form.city) {
      setError("Full name, phone, address and city are required.");
      return;
    }
    setBusy(true);
    try {
      const isNew = editingId === "";
      const url = isNew ? `/api/addresses` : `/api/addresses?id=${editingId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save address.");
        return;
      }
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch {
      setError("Could not save address.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (a: Address) => {
    if (!user) return;
    if (!confirm(`Delete ${a.label} address (${a.line1}, ${a.city})?`)) return;
    const res = await fetch(`/api/addresses?id=${a.id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === a.id) {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
      }
      await load();
    }
  };

  const setDefault = async (a: Address) => {
    if (!user || a.isDefault) return;
    const res = await fetch(`/api/addresses?id=${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) await load();
  };

  const labelIcon = (label: string) =>
    label.toLowerCase() === "office" ? FiBriefcase : FiHome;

  const inputCls =
    "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 transition-all placeholder:text-gray-300";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            <div className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/" className="hover:text-[#FF6B35] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/account" className="hover:text-[#FF6B35] transition-colors">My Account</Link>
            <span>/</span>
            <span className="text-secondary font-medium">Addresses</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link
              href="/account"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors mb-2"
            >
              <FiChevronLeft size={14} /> Back to My Account
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1F1F] tracking-tight">Saved Addresses</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage the addresses used at checkout. Your default address is pre-selected automatically.
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((a) => {
              const Icon = labelIcon(a.label);
              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
                        <Icon className="text-[#FF6B35]" size={17} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[#1F1F1F] capitalize">{a.label}</p>
                        {a.isDefault && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(a)}
                        className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-gray-50 rounded-lg transition-colors"
                        aria-label="Edit address"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete address"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-sm flex-1">
                    <p className="font-semibold text-[#1F1F1F]">{a.fullName}</p>
                    <p className="text-gray-500">{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                    {(a.area || a.city) && (
                      <p className="text-gray-500">
                        {[a.area, a.city, a.province, a.postalCode].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="text-gray-500">{a.country}</p>
                    <p className="text-gray-400">{a.phone}</p>
                  </div>

                  {!a.isDefault && (
                    <button
                      onClick={() => setDefault(a)}
                      className="mt-3 text-xs font-semibold text-[#FF6B35] hover:text-[#e05a2b] transition-colors self-start"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add card */}
            <button
              onClick={startAdd}
              className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF6B35]/40 hover:bg-[#FF6B35]/5 transition-all min-h-[140px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#FF6B35]"
            >
              <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiPlus size={20} />
              </span>
              <span className="text-sm font-semibold">Add New Address</span>
            </button>
          </div>

          {addresses.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-6">
              You haven&apos;t saved any addresses yet.
            </p>
          )}

          {(editingId !== null) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-[#1F1F1F] mb-1">
                  {editingId === "" ? "Add Address" : "Edit Address"}
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  This address will be offered at checkout.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name *</label>
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone *</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3XX XXXXXXX" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Label</label>
                    <select
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">City *</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Street Address *</label>
                    <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House no, street, area" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Apartment / Suite (optional)</label>
                    <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Area</label>
                    <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Province</label>
                    <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Postal Code</label>
                    <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Country</label>
                    <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setEditingId(null); setError(""); }}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={busy}
                    className="px-6 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all active:scale-95 disabled:opacity-60"
                  >
                    {busy ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
