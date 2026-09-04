"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function SellerNewProductPage() {
  const router = useRouter();
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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

      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create product");
        return;
      }
      router.push("/seller/products");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-6">
            New Product
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
                placeholder="Product name"
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
                  placeholder="0"
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
                  placeholder="0"
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
                  placeholder="e.g. Oversized"
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
                placeholder="Product description..."
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
                  placeholder="S, M, L, XL"
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
                  placeholder="Red, Blue, Black"
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
                placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
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
                  placeholder="0"
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
                  placeholder="SKU-001"
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
              disabled={loading}
              className="w-full h-11 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave size={16} />
                  Create Product
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
