"use client";

import React, { useState } from 'react';
import { FiSearch, FiX, FiChevronDown, FiSliders } from 'react-icons/fi';

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  genderFilter: string;
  onGenderFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

const categories = ['All', 'Clothing', 'Shoes', 'Accessories', 'Activewear', 'Bags', 'Watches'];
const genders = ['All', 'Men', 'Women', 'Kids', 'Unisex'];
const statuses = ['All', 'Active', 'Inactive'];

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const isActive = value !== 'All';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
          isActive
            ? 'bg-primary/5 border-primary/30 text-primary'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">{label}:</span>
        <span>{value}</span>
        <FiChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1 animate-in">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  value === opt
                    ? 'bg-primary/5 text-primary font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ProductFilters: React.FC<ProductFiltersProps> = ({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  genderFilter,
  onGenderFilterChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
}) => {
  const hasFilters = search || categoryFilter !== 'All' || genderFilter !== 'All' || statusFilter !== 'All';
  const activeCount = [categoryFilter, genderFilter, statusFilter].filter(v => v !== 'All').length + (search ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative group">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, category, or SKU..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition text-sm bg-gray-50 focus:bg-white"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          <FilterDropdown label="Category" value={categoryFilter} options={categories} onChange={onCategoryFilterChange} />
          <FilterDropdown label="Gender" value={genderFilter} options={genders} onChange={onGenderFilterChange} />
          <FilterDropdown label="Status" value={statusFilter} options={statuses} onChange={onStatusFilterChange} />
        </div>
      </div>

      {/* Active Filters + Clear */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FiSliders size={12} />
            <span>Active filters:</span>
          </div>
          {search && (
            <button onClick={() => onSearchChange('')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-red-50 hover:text-red-500 transition group">
              &ldquo;{search}&rdquo;
              <FiX size={10} className="text-gray-400 group-hover:text-red-500" />
            </button>
          )}
          {categoryFilter !== 'All' && (
            <button onClick={() => onCategoryFilterChange('All')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-red-50 hover:text-red-500 transition group">
              {categoryFilter}
              <FiX size={10} className="text-gray-400 group-hover:text-red-500" />
            </button>
          )}
          {genderFilter !== 'All' && (
            <button onClick={() => onGenderFilterChange('All')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-red-50 hover:text-red-500 transition group">
              {genderFilter}
              <FiX size={10} className="text-gray-400 group-hover:text-red-500" />
            </button>
          )}
          {statusFilter !== 'All' && (
            <button onClick={() => onStatusFilterChange('All')} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-red-50 hover:text-red-500 transition group">
              {statusFilter}
              <FiX size={10} className="text-gray-400 group-hover:text-red-500" />
            </button>
          )}
          <button
            onClick={onClearFilters}
            className="text-xs text-gray-400 hover:text-red-500 font-medium underline transition ml-1"
          >
            Clear all ({activeCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;
