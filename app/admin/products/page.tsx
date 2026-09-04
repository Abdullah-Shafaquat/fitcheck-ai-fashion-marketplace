"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiTrash2, FiChevronLeft, FiChevronRight, FiUpload, FiDownload } from 'react-icons/fi';
import DeleteProductDialog from '@/Components/admin/DeleteProductDialog';
import ImportExportModal from '@/Components/admin/ImportExportModal';
import ExportModal from '@/Components/admin/ExportModal';
import ProductFilters from '@/Components/admin/ProductFilters';
import ProductTable from '@/Components/admin/ProductTable';
import { useToast } from '@/Components/admin/Toast';
import PageTransition from '@/Components/admin/PageTransition';
 

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  category: string;
  gender: string;
  images: string[];
  colorImages?: Record<string, string[]>;
  stock: number;
  featured: boolean;
  latestArrival: boolean;
  isActive: boolean;
  badge?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  sku?: string;
  subCategory?: string;
}

const AdminProductsPage: React.FC = () => {
  const router = useRouter();
  const { success } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productsToDelete, setProductsToDelete] = useState<Product[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        if (active && !data.authenticated) router.push('/admin/login');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products?limit=1000');
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.products || [];
        setProducts(items);
        setFilteredProducts(items);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = products;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower) ||
          p.slug.toLowerCase().includes(searchLower)
      );
    }
    if (categoryFilter !== 'All') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }
    if (genderFilter !== 'All') {
      filtered = filtered.filter((p) => p.gender === genderFilter);
    }
    if (statusFilter === 'Active') {
      filtered = filtered.filter((p) => p.isActive);
    } else if (statusFilter === 'Inactive') {
      filtered = filtered.filter((p) => !p.isActive);
    }
    setFilteredProducts(filtered);
    setSelectedProducts(new Set());
    setSelectAll(false);
    setCurrentPage(1);
  }, [products, search, categoryFilter, genderFilter, statusFilter]);

  const handleDelete = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setProductToDelete(product);
      setProductsToDelete([]);
      setDeleteDialogOpen(true);
      setDeleteError(null);
    }
  };

  const handleBulkDelete = () => {
    const toDelete = products.filter((p) => selectedProducts.has(p.id));
    if (toDelete.length === 0) return;
    setProductsToDelete(toDelete);
    setProductToDelete(null);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!productToDelete && productsToDelete.length === 0) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const idsToDelete = productToDelete
        ? [productToDelete.id]
        : productsToDelete.map((p) => p.id);

      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          fetch(`/api/products/${id}`, {
            method: 'DELETE',
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Failed' }));
              throw new Error(err.error || `HTTP ${res.status}`);
            }
            return res;
          })
        )
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected');
      const failedErrors = failed.map((r) => (r as PromiseRejectedResult).reason?.message || 'Unknown error');

      if (failed.length === 0) {
        setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        setProductsToDelete([]);
        setSelectedProducts(new Set());
        setSelectAll(false);
        success(`Successfully deleted ${succeeded} product${succeeded > 1 ? 's' : ''}`);
      } else if (succeeded > 0) {
        setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
        setDeleteError(`${succeeded} deleted, ${failed.length} failed: ${failedErrors.slice(0, 3).join(', ')}`);
      } else {
        setDeleteError(failedErrors[0] || 'Failed to delete products');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setGenderFilter('All');
    setStatusFilter('All');
  };

  const toggleProductSelection = (id: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProducts(newSelection);
    setSelectAll(newSelection.size === filteredProducts.length && filteredProducts.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      const allIds = filteredProducts.map(p => p.id);
      setSelectedProducts(new Set(allIds));
    }
    setSelectAll(!selectAll);
  };

  // Export function
  const handleExport = () => {
    const productsToExport = selectedProducts.size > 0 
      ? products.filter(p => selectedProducts.has(p.id))
      : products;

    return productsToExport.map(product => ({
      ID: product.id,
      Name: product.name,
      Price: product.price,
      'Old Price': product.oldPrice || '',
      Category: product.category,
      'Sub Category': product.subCategory || '',
      Gender: product.gender,
      Stock: product.stock,
      SKU: product.sku || '',
      Badge: product.badge || '',
      Featured: product.featured ? 'Yes' : 'No',
      'Latest Arrival': product.latestArrival ? 'Yes' : 'No',
      Status: product.isActive ? 'Active' : 'Inactive',
      Description: product.description || '',
      Sizes: product.sizes?.join(', ') || '',
      Colors: product.colors?.join(', ') || '',
      'Product Images': (product.images || []).join(', ') || '',
      'Color-Wise Images (JSON)': product.colorImages && Object.keys(product.colorImages).length
        ? JSON.stringify(product.colorImages)
        : '',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-gray-400 font-medium">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedProducts.size;
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <PageTransition className="h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e05a2b] transition-all duration-200 hover:shadow-lg hover:shadow-[#FF6B35]/25 text-sm active:scale-[0.98]"
          >
            <FiPlus size={16} />
            Add Product
          </Link>
          {selectedCount > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 hover:border-red-300 transition-all duration-200 text-sm active:scale-[0.98]"
            >
              <FiTrash2 size={16} />
              Delete ({selectedCount})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl hover:border-[#FF6B35]/40 hover:text-[#FF6B35] hover:bg-[#FF6B35]/[0.03] transition-all duration-200 text-sm active:scale-[0.98] shadow-sm"
          >
            <FiUpload size={16} />
            Import
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 font-semibold rounded-xl hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all duration-200 text-sm active:scale-[0.98] shadow-sm"
          >
            <FiDownload size={16} />
            Export
            {selectedCount > 0 && (
              <span className="text-[10px] font-bold bg-teal-500/10 text-teal-600 px-1.5 py-0.5 rounded-full">
                {selectedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 mb-6">
        <ProductFilters
          search={search}
          onSearchChange={setSearch}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          genderFilter={genderFilter}
          onGenderFilterChange={setGenderFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={clearFilters}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Showing <span className="font-bold text-[#1F1F1F]">{paginatedProducts.length}</span> of{' '}
          <span className="font-bold text-[#1F1F1F]">{filteredProducts.length}</span> products
          {totalPages > 1 && (
            <span className="text-gray-400 ml-1">
              (Page {currentPage} of {totalPages})
            </span>
          )}
        </p>
        {selectedCount > 0 && (
          <span className="text-xs font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-3 py-1 rounded-full">
            {selectedCount} selected
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredProducts.length > 0 ? (
          <>
            <ProductTable 
              products={paginatedProducts} 
              onDelete={handleDelete}
              selectedProducts={selectedProducts}
              onToggleSelect={toggleProductSelection}
              selectAll={selectAll}
              onToggleSelectAll={toggleSelectAll}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                >
                  <FiChevronLeft size={14} />
                  Previous
                </button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "ellipsis" ? (
                        <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                            currentPage === p
                              ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                >
                  Next
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found matching your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-[#FF6B35] hover:underline text-sm font-semibold">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </PageTransition>

      <DeleteProductDialog
        isOpen={deleteDialogOpen}
        productName={productToDelete?.name || ''}
        productNames={productsToDelete.length > 0 ? productsToDelete.map(p => p.name) : (productToDelete ? [productToDelete.name] : [])}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProductToDelete(null);
          setProductsToDelete([]);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        error={deleteError}
      />

      <ImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onRefresh={fetchProducts}
        productCount={products.length}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        productCount={products.length}
        selectedCount={selectedProducts.size}
      />
    </>
  );
};

export default AdminProductsPage;
