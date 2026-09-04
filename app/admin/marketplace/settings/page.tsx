"use client";

import React, { useState, useEffect } from "react";
import { FiSettings, FiSave } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface Settings {
  default_commission_rate: number;
  auto_approve_products: boolean;
  auto_approve_sellers: boolean;
  return_window_days: number;
  payout_min_amount: number;
}

export default function MarketplaceSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/marketplace/settings");
        const data = await res.json();
        setSettings(data.settings || null);
        if (!res.ok) setFetchError(data.error || "Failed to load settings");
      } catch {
        setFetchError("Network error — could not load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const flash = (type: "ok" | "err", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketplace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash("err", data.error || "Failed to save settings");
        return;
      }
      if (data.settings) setSettings(data.settings);
      flash("ok", "Settings saved successfully");
    } catch {
      flash("err", "Network error — could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-red-500">{fetchError}</p>
      </div>
    );
  }

  return (
    <PageTransition className="h-full">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center">
            <FiSettings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1F1F1F]">Marketplace Settings</h1>
            <p className="text-xs text-gray-400">Configure marketplace defaults</p>
          </div>
        </div>

        {feedback && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${feedback.type === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-red-50 border-red-100 text-red-600"}`}>
            {feedback.msg}
          </div>
        )}

        {settings && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Default Commission Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.default_commission_rate}
                onChange={(e) => setSettings({ ...settings, default_commission_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Auto-Approve Seller Products</label>
              <select
                value={settings.auto_approve_products ? "true" : "false"}
                onChange={(e) => setSettings({ ...settings, auto_approve_products: e.target.value === "true" })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
              >
                <option value="true">Yes — auto-approve</option>
                <option value="false">No — require manual review</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Auto-Approve Sellers</label>
              <select
                value={settings.auto_approve_sellers ? "true" : "false"}
                onChange={(e) => setSettings({ ...settings, auto_approve_sellers: e.target.value === "true" })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
              >
                <option value="true">Yes — auto-approve</option>
                <option value="false">No — require manual review</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Return Window (days)</label>
              <input
                type="number"
                min={0}
                value={settings.return_window_days}
                onChange={(e) => setSettings({ ...settings, return_window_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Minimum Payout Amount (Rs)</label>
              <input
                type="number"
                min={0}
                value={settings.payout_min_amount}
                onChange={(e) => setSettings({ ...settings, payout_min_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-colors disabled:opacity-50"
              >
                <FiSave size={15} />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
