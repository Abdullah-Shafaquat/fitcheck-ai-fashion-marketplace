"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import PageTransition from "@/Components/admin/PageTransition";

const CATEGORIES = [
  "T-Shirts",
  "Pants",
  "Hoodies",
  "Sneakers",
  "Accessories",
  "Jackets",
];

const statusBanner = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "PENDING_REVIEW":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "REJECTED":
      return "bg-red-50 border-red-200 text-red-700";
    case "DRAFT":
      return "bg-gray-50 border-gray-200 text-gray-600";
    default:
      return "bg-gray-50 border-gray-200 text-gray-600";
  }
};

export default function SellerEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [form, setForm] = useState({
    name: "",
    price: "",
    oldPrice: "",
    category: "",
    subCategory: "",
    gender: "Men",
    description: "",
    sizes: "",
    colors: "",
    images: "",
    stock: "",
    sku: "",
    lowStockThreshold: "5",
  });
  const [approvalStatus, setApprovalStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/seller/products/${id}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/seller/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const p = data.product;
        setForm({
          name: p.name || "",
          price: String(p.price || ""),
          oldPrice: p.oldPrice ? String(p.oldPrice) : "",
          category: p.category || "",
          subCategory: p.subCategory || "",
          gender: p.gender || "Men",
          description: p.description || "",
          sizes: Array.isArray(p.sizes) ? p.sizes.join(", ") : p.sizes || "",
          colors: Array.isArray(p.colors) ? p.colors.join(", ") : p.colors || "",
          images: Array.isArray(p.images) ? p.images.join(", ") : p.images || "",
          stock: String(p.stock ?? ""),
          sku: p.sku || "",
          lowStockThreshold: String(p.lowStockThreshold ?? 5),
        });
        setApprovalStatus(p.approvalStatus || "");
        setRejectionReason(p.rejectionReason || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const body = {
        name: form.name,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
        category: form.category,
        subCategory: form.subCategory || undefined,
        gender: form.gender,
        description: form.description || undefined,
        sizes: form.sizes
          ? form.sizes.split(",").map((s) => s.trim())
          : undefined,
        colors: form.colors
          ? form.colors.split(",").map((c) => c.trim())
          : undefined,
        images: form.images
          ? form.images.split(",").map((u) => u.trim())
          : undefined,
        stock: form.stock ? Number(form.stock) : 0,
        sku: form.sku || undefined,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
      };

      const res = await fetch(`/api/seller/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update product");
        return;
      }
      router.push("/seller/products");
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
      <div className="max-w-2xl mx-auto">
        <Link
          href="/seller/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FF6B35] transition-colors mb-6"
        >
          <FiArrowLeft size={14} />
          Back to Products
        </Link>

        {approvalStatus && (
          <div
            className={`border rounded-xl px-4 py-3 mb-6 text-sm font-semibold ${statusBanner(approvalStatus)}`}
          >
            Status: {approvalStatus.replace("_", " ")}
            {approvalStatus === "REJECTED" && rejectionReason && (
              <span className="block text-xs font-normal mt-1 opacity-80">
                Reason: {rejectionReason}
              </span>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-6">
            Edit Product
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Price (Rs) *
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  required
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Old Price (Rs)
                </label>
                <input
                  type="number"
                  value={form.oldPrice}
                  onChange={(e) => update("oldPrice", e.target.value)}
                  min="0"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Sub Category
                </label>
                <input
                  type="text"
                  value={form.subCategory}
                  onChange={(e) => update("subCategory", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Gender *
              </label>
              <select
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                required
                className={inputClass}
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className={`${inputClass} h-auto py-2.5 resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Sizes (comma separated)
                </label>
                <input
                  type="text"
                  value={form.sizes}
                  onChange={(e) => update("sizes", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Colors (comma separated)
                </label>
                <input
                  type="text"
                  value={form.colors}
                  onChange={(e) => update("colors", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Image URLs (comma separated)
              </label>
              <textarea
                value={form.images}
                onChange={(e) => update("images", e.target.value)}
                rows={2}
                className={`${inputClass} h-auto py-2.5 resize-none`}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Stock
                </label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => update("stock", e.target.value)}
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  SKU
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => update("sku", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Low Stock At
                </label>
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) => update("lowStockThreshold", e.target.value)}
                  min="0"
                  className={inputClass}
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
