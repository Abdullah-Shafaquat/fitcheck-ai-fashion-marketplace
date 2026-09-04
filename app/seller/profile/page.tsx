"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiSave,
  FiExternalLink,
  FiMapPin,
  FiPhone,
  FiGlobe,
  FiAlertCircle,
} from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

interface SellerProfile {
  storeName: string;
  ownerName: string;
  phone: string;
  businessType: string;
  description: string;
  address: string;
  city: string;
  province: string;
  country: string;
  supportContact: string;
  logo: string | null;
  banner: string | null;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  approvalStatus: string;
  storeSlug: string;
}

export default function SellerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState({
    storeName: "",
    ownerName: "",
    phone: "",
    businessType: "dropshipping",
    description: "",
    address: "",
    city: "",
    province: "",
    country: "",
    supportContact: "",
    logo: "",
    banner: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  });

  const fetchProfile = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch("/api/seller/profile");
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const s = data.seller;
        setProfile(s);
        setForm({
          storeName: s.storeName || "",
          ownerName: s.ownerName || "",
          phone: s.phone || "",
          businessType: s.businessType || "dropshipping",
          description: s.description || "",
          address: s.address || "",
          city: s.city || "",
          province: s.province || "",
          country: s.country || "",
          supportContact: s.supportContact || "",
          logo: s.logo || "",
          banner: s.banner || "",
          instagram: s.socialLinks?.instagram || "",
          facebook: s.socialLinks?.facebook || "",
          tiktok: s.socialLinks?.tiktok || "",
        });
      } else {
        setFetchError("Failed to load your profile. Please try again.");
      }
    } catch {
      setFetchError("Failed to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const body = {
        storeName: form.storeName,
        ownerName: form.ownerName,
        phone: form.phone,
        businessType: form.businessType,
        description: form.description,
        address: form.address,
        city: form.city,
        province: form.province,
        country: form.country,
        supportContact: form.supportContact,
        logo: form.logo || undefined,
        banner: form.banner || undefined,
        socialLinks: {
          instagram: form.instagram || undefined,
          facebook: form.facebook || undefined,
          tiktok: form.tiktok || undefined,
        },
      };

      const res = await fetch("/api/seller/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }
      setSuccess("Profile updated successfully");
      fetchProfile();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-all";

  return (
    <PageTransition className="h-full">
      <div className="max-w-2xl mx-auto space-y-6">
        {fetchError && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <FiAlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{fetchError}</p>
          </div>
        )}

        {profile?.storeSlug && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Storefront URL</p>
              <p className="text-sm font-semibold text-[#1F1F1F] font-mono">
                /store/{profile.storeSlug}
              </p>
            </div>
            <Link
              href={`/store/${profile.storeSlug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#FF6B35] bg-[#FF6B35]/5 rounded-lg hover:bg-[#FF6B35]/10 transition-all"
            >
              <FiExternalLink size={12} />
              View
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-6">
            Store Profile
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3 mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Store Name
              </label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => update("storeName", e.target.value)}
                className={inputClass}
              />
            </div>

            {profile?.storeSlug && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Store Slug (read-only)
                </label>
                <input
                  type="text"
                  value={profile.storeSlug}
                  disabled
                  className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Owner Name
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Phone
                </label>
                <div className="relative">
                  <FiPhone
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Business Type
                </label>
                <select
                  value={form.businessType}
                  onChange={(e) => update("businessType", e.target.value)}
                  className={inputClass}
                >
                  <option value="dropshipping">Dropshipping</option>
                  <option value="boutique">Boutique</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="reseller">Reseller</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className={`${inputClass} h-auto py-2.5 resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Address
              </label>
              <div className="relative">
                <FiMapPin
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Province
                </label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => update("province", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Country
                </label>
                <div className="relative">
                  <FiGlobe
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Support Contact
              </label>
              <input
                type="text"
                value={form.supportContact}
                onChange={(e) => update("supportContact", e.target.value)}
                className={inputClass}
                placeholder="Phone or email for support"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Logo URL
              </label>
              <input
                type="url"
                value={form.logo}
                onChange={(e) => update("logo", e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Banner URL
              </label>
              <input
                type="url"
                value={form.banner}
                onChange={(e) => update("banner", e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Social Links
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={form.instagram}
                  onChange={(e) => update("instagram", e.target.value)}
                  className={inputClass}
                  placeholder="Instagram URL"
                />
                <input
                  type="url"
                  value={form.facebook}
                  onChange={(e) => update("facebook", e.target.value)}
                  className={inputClass}
                  placeholder="Facebook URL"
                />
                <input
                  type="url"
                  value={form.tiktok}
                  onChange={(e) => update("tiktok", e.target.value)}
                  className={inputClass}
                  placeholder="TikTok URL"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave size={16} />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
