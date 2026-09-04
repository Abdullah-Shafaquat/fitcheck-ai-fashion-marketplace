import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  oldPrice: z.number().positive('Old price must be positive').optional(),
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional(),
  gender: z.string().min(1, 'Gender is required'),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  sku: z.string().optional(),
  badge: z.string().optional(),
  featured: z.boolean().default(false),
  latestArrival: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;