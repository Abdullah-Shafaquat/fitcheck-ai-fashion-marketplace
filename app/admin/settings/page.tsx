"use client";

import React, { useState, useEffect } from "react";
import {
  FiSave,
  FiCheck,
  FiHome,
  FiMail,
  FiTruck,
  FiShield,
} from "react-icons/fi";
import { useToast } from "@/Components/admin/Toast";

const defaults = {
  storeName: "FitCheck",
  storeEmail: "support@fitcheck.pk",
  storePhone: "+92 300 1234567",
  storeAddress: "Karachi, Pakistan",
  currency: "PKR",
  taxRate: "8",
  freeShippingThreshold: "5000",
  standardShipping: "250",
  expressShipping: "500",
  lowStockThreshold: "10",
  productsPerPage: "12",
  maintenanceMode: false,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyWeeklyReports: false,
  notifyNewCustomers: true,
};

const NOTIFICATION_FIELDS: { name: keyof typeof defaults; label: string }[] = [
  { name: "notifyNewOrders", label: "Email notifications for new orders" },
  { name: "notifyLowStock", label: "Low stock alerts" },
  { name: "notifyWeeklyReports", label: "Weekly sales reports" },
  { name: "notifyNewCustomers", label: "New customer registration alerts" },
];

export default function AdminSettingsPage() {
  const { success } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(defaults);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        if (!cancelled) setSettings((prev) => ({ ...prev, ...data.settings }));
      } catch {
        if (!cancelled) setError("Could not load settings from the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save settings.");
        return;
      }
      setSettings((prev) => ({ ...prev, ...data.settings }));
      setSaved(true);
      success("Settings saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Loading */}
      {loading && (
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 font-medium">
          Loading settings…
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Success toast */}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-600 font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <FiCheck size={16} className="text-emerald-600" />
          </div>
          Settings saved successfully!
        </div>
      )}

      {/* Store Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FiHome size={17} className="text-blue-500" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1F1F]">
            Store Information
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Store Name", name: "storeName", type: "text" },
            { label: "Store Email", name: "storeEmail", type: "email" },
            { label: "Phone", name: "storePhone", type: "tel" },
            { label: "Address", name: "storeAddress", type: "text" },
          ].map((field) => (
            <div key={field.name}>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                {field.label}
              </label>
              <input
                name={field.name}
                type={field.type}
                value={String(
                  (settings as unknown as Record<string, string>)[field.name]
                )}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]/40 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Payment & Tax */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
            <FiShield size={17} className="text-purple-500" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1F1F]">Payment & Tax</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Currency
            </label>
            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            >
              <option value="PKR">PKR (Rs)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Tax Rate (%)
            </label>
            <input
              name="taxRate"
              type="number"
              value={settings.taxRate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <FiTruck size={17} className="text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1F1F]">Shipping</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Free Shipping Threshold (Rs)
            </label>
            <input
              name="freeShippingThreshold"
              type="number"
              value={settings.freeShippingThreshold}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Standard Shipping (Rs)
            </label>
            <input
              name="standardShipping"
              type="number"
              value={settings.standardShipping}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Express Shipping (Rs)
            </label>
            <input
              name="expressShipping"
              type="number"
              value={settings.expressShipping}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <FiMail size={17} className="text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1F1F]">Notifications</h3>
        </div>
        <div className="space-y-3">
          {NOTIFICATION_FIELDS.map((item) => (
            <label
              key={item.name}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                name={item.name}
                checked={Boolean(
                  (
                    settings as unknown as Record<string, unknown>
                  )[item.name]
                )}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
              />
              <span className="text-sm text-gray-600 group-hover:text-[#1F1F1F] transition-colors">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-[#1F1F1F] mb-5">General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Low Stock Threshold
            </label>
            <input
              name="lowStockThreshold"
              type="number"
              value={settings.lowStockThreshold}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Products Per Page
            </label>
            <input
              name="productsPerPage"
              type="number"
              value={settings.productsPerPage}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 transition-all"
            />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
            />
            <span className="text-sm text-gray-600 group-hover:text-[#1F1F1F] transition-colors">
              Enable maintenance mode
            </span>
          </label>
          {settings.maintenanceMode && (
            <p className="text-xs text-amber-600 mt-2 ml-7 font-medium">
              Warning: The store will be temporarily unavailable to customers.
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white text-sm font-bold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 hover:shadow-lg hover:shadow-[#FF6B35]/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FiSave size={16} />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
