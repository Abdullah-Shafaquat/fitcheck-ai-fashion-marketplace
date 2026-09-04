"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiSave, FiPlus, FiX, FiCheckCircle,
  FiAlertCircle, FiTag, FiDollarSign,
  FiGrid, FiLayers, FiBox, FiImage, FiFlag,
  FiArrowLeft,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';
import ProductImageManager from './ProductImageManager';
import PageTransition from './PageTransition';

interface ProductFormData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string;
  subCategory: string | null;
  gender: string;
  sizes: string[];
  colors: string[];
  images: string[];
  stock: number;
  sku: string;
  badge: string;
  featured: boolean;
  latestArrival: boolean;
  isActive: boolean;
}

interface ProductFormProps {
  initialData?: ProductFormData | any;
  isEdit?: boolean;
}

const categories = ['Men', 'Women', 'Kids', 'Clothing', 'Shoes', 'Accessories'];
const subCategories = ['T-Shirts', 'Shirts', 'Jeans', 'Hoodies', 'Jackets', 'Trousers', 'Dresses', 'Sneakers', 'Bags', 'Watches', 'Belts', 'Caps', 'Streetwear'];
const genders = ['Men', 'Women', 'Kids', 'Unisex'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colorOptions = ['Black', 'White', 'Orange', 'Navy', 'Beige', 'Gray', 'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Brown'];
const badgeOptions = ['None', 'New', 'Best Seller', 'Featured', 'Limited', 'Sale'];

const fieldClass =
  "w-full px-4 py-2.5 text-sm text-secondary border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

const labelClass =
  "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5";

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon size={17} className="text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-secondary">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

const ProductForm: React.FC<ProductFormProps> = ({ initialData, isEdit = false }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    oldPrice: undefined,
    category: '',
    subCategory: null,
    gender: '',
    sizes: [],
    colors: [],
    images: [],
    stock: 0,
    sku: '',
    badge: 'None',
    featured: false,
    latestArrival: false,
    isActive: true,
    ...initialData,
  });

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (initialData?.sizes) return initialData.sizes;
    return [];
  });
  
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    if (initialData?.colors) return initialData.colors;
    return [];
  });

  const [newColor, setNewColor] = useState('');
  const [colorError, setColorError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        subCategory: initialData.subCategory || null,
        oldPrice: initialData.oldPrice || undefined,
      }));
      if (initialData.sizes) setSelectedSizes(initialData.sizes);
      if (initialData.colors) setSelectedColors(initialData.colors);
    }
  }, [initialData]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      if (name === 'name' && (!prev.slug || prev.slug === generateSlug(prev.name))) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleToggle = (name: string) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name as keyof ProductFormData] }));
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = selectedSizes.includes(size) 
      ? selectedSizes.filter(s => s !== size) 
      : [...selectedSizes, size];
    setSelectedSizes(newSizes);
    setFormData(prev => ({ ...prev, sizes: newSizes }));
  };

  const handleColorToggle = (color: string) => {
    const newColors = selectedColors.includes(color) 
      ? selectedColors.filter(c => c !== color) 
      : [...selectedColors, color];
    setSelectedColors(newColors);
    setFormData(prev => ({ ...prev, colors: newColors }));
  };

  const addColor = () => {
    setColorError('');
    
    if (!newColor || !newColor.trim()) {
      setColorError('Please enter a color name');
      return;
    }

    const trimmedColor = newColor.trim();
    
    if (selectedColors.includes(trimmedColor)) {
      setColorError('This color is already added');
      return;
    }

    const newColors = [...selectedColors, trimmedColor];
    setSelectedColors(newColors);
    setFormData(prev => ({ ...prev, colors: newColors }));
    setNewColor('');
    setColorError('');
  };

  const removeColor = (color: string) => {
    const newColors = selectedColors.filter(c => c !== color);
    setSelectedColors(newColors);
    setFormData(prev => ({ ...prev, colors: newColors }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleSubmit = async (e: React.FormEvent, action?: 'save' | 'saveAndAdd') => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name || !formData.price || !formData.category || !formData.gender) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.images.length === 0) {
      setError('Please add at least one product image');
      setLoading(false);
      return;
    }

    try {
      const url = isEdit ? `/api/products/${formData.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        oldPrice: formData.oldPrice || null,
        subCategory: formData.subCategory || null,
        colors: selectedColors,
        sizes: selectedSizes,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save product');
      }

      setSuccess(true);
      setLoading(false);

      if (action === 'saveAndAdd') {
        setFormData({
          name: '',
          slug: '',
          description: '',
          price: 0,
          oldPrice: undefined,
          category: '',
          subCategory: null,
          gender: '',
          sizes: [],
          colors: [],
          images: [],
          stock: 0,
          sku: '',
          badge: 'None',
          featured: false,
          latestArrival: false,
          isActive: true,
        });
        setSelectedSizes([]);
        setSelectedColors([]);
        setSuccess(false);
      } else {
        setTimeout(() => router.push('/admin/products'), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <PageTransition>
    <form onSubmit={(e) => handleSubmit(e, 'save')} className="space-y-6">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm"
          >
            <FiAlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-sm"
          >
            <FiCheckCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span className="font-medium">
              Product {isEdit ? 'updated' : 'created'} successfully!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <SectionCard icon={FiTag} title="Basic Information" subtitle="Identity of the product">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Product Name <span className="text-primary">*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Slug <span className="text-primary">*</span></label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              className={fieldClass}
              required
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className={`${fieldClass} resize-y`}
          />
        </div>
      </SectionCard>

      <SectionCard icon={FiDollarSign} title="Pricing" subtitle="Pricing and discounts">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Price <span className="text-primary">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`${fieldClass} pl-8`}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Old Price</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                name="oldPrice"
                value={formData.oldPrice || ''}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`${fieldClass} pl-8`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Discount</label>
            <div
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                formData.oldPrice && formData.oldPrice > formData.price
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {formData.oldPrice && formData.oldPrice > formData.price ? (
                <>
                  <FiTag size={14} />
                  {Math.round(((formData.oldPrice - formData.price) / formData.oldPrice) * 100)}% OFF
                </>
              ) : (
                'No discount'
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FiGrid} title="Category" subtitle="Organize the product">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Category <span className="text-primary">*</span></label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={fieldClass}
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sub-Category</label>
            <select
              name="subCategory"
              value={formData.subCategory || ''}
              onChange={handleInputChange}
              className={fieldClass}
            >
              <option value="">Select sub-category</option>
              {subCategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Gender <span className="text-primary">*</span></label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className={fieldClass}
              required
            >
              <option value="">Select gender</option>
              {genders.map(gender => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FiLayers} title="Sizes & Colors" subtitle="Available variants">
        <div className="space-y-4">
          <div>
            <label className={`${labelClass} mb-2`}>Sizes</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeToggle(size)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    selectedSizes.includes(size)
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedSizes.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">Selected: <span className="text-primary font-medium">{selectedSizes.join(', ')}</span></p>
            )}
          </div>
          <div>
            <label className={`${labelClass} mb-2`}>Colors</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorToggle(color)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    selectedColors.includes(color)
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => {
                    setNewColor(e.target.value);
                    setColorError('');
                  }}
                  placeholder="Add custom color..."
                  className={`flex-1 px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
                    colorError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addColor();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-200 active:scale-95 flex items-center gap-1 whitespace-nowrap"
                >
                  <FiPlus size={16} /> Add Color
                </button>
              </div>
              {colorError && (
                <p className="text-xs text-red-500 font-medium">{colorError}</p>
              )}
            </div>
            {selectedColors.length > 0 && (
              <AnimatePresence>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400 mr-2 self-center">Added:</span>
                  {selectedColors.map(color => (
                    <motion.span
                      key={color}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full"
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="hover:text-red-500 transition"
                      >
                        <FiX size={14} />
                      </button>
                    </motion.span>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FiBox} title="Stock & SKU" subtitle="Inventory and identifier">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Stock Quantity <span className="text-primary">*</span></label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              min="0"
              className={fieldClass}
              required
            />
            <AnimatePresence>
              {formData.stock < 10 && formData.stock > 0 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-amber-500 mt-1.5 font-medium overflow-hidden"
                >
                  Low stock: {formData.stock} items left
                </motion.p>
              )}
            </AnimatePresence>
            {formData.stock === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-500 mt-1.5 font-medium"
              >
                Out of stock
              </motion.p>
            )}
          </div>
          <div>
            <label className={labelClass}>SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              className={fieldClass}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={FiImage} title="Product Images" subtitle="Gallery, primary and ordering">
        <ProductImageManager
          images={formData.images}
          onImagesChange={handleImagesChange}
        />
      </SectionCard>

      <SectionCard icon={FiFlag} title="Badge & Flags" subtitle="Marketing and visibility">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Badge</label>
            <select
              name="badge"
              value={formData.badge}
              onChange={handleInputChange}
              className={fieldClass}
            >
              {badgeOptions.map(badge => <option key={badge} value={badge}>{badge}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Featured Product</span>
              <button
                type="button"
                aria-pressed={formData.featured}
                onClick={() => handleToggle('featured')}
                className={`w-11 h-6 rounded-full transition-all duration-300 ${
                  formData.featured ? 'bg-primary shadow-inner' : 'bg-gray-300'
                } relative cursor-pointer`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                  formData.featured ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Latest Arrival</span>
              <button
                type="button"
                aria-pressed={formData.latestArrival}
                onClick={() => handleToggle('latestArrival')}
                className={`w-11 h-6 rounded-full transition-all duration-300 ${
                  formData.latestArrival ? 'bg-primary shadow-inner' : 'bg-gray-300'
                } relative cursor-pointer`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                  formData.latestArrival ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Active Product</span>
              <button
                type="button"
                aria-pressed={formData.isActive}
                onClick={() => handleToggle('isActive')}
                className={`w-11 h-6 rounded-full transition-all duration-300 ${
                  formData.isActive ? 'bg-emerald-500 shadow-inner' : 'bg-gray-300'
                } relative cursor-pointer`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                  formData.isActive ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 pt-2 pb-1">
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={loading ? undefined : { scale: 0.97 }}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FiSave size={17} />
              {isEdit ? 'Update Product' : 'Save Product'}
            </>
          )}
        </motion.button>
        {!isEdit && (
          <motion.button
            type="button"
            onClick={(e) => handleSubmit(e, 'saveAndAdd')}
            disabled={loading}
            whileTap={loading ? undefined : { scale: 0.97 }}
            className="px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiPlus size={17} />
            Save & Add Another
          </motion.button>
        )}
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          disabled={loading}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
        >
          <FiArrowLeft size={16} />
          Cancel
        </button>
      </div>
    </form>
    </PageTransition>
  );
};

export default ProductForm;