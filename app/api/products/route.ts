import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { notifyAdmin } from '@/lib/notify';
import { normalizeImages, normalizeColorImages } from '@/lib/productImages';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const gender = searchParams.get('gender');
    const subCategory = searchParams.get('subCategory');
    const featured = searchParams.get('featured');
    const latest = searchParams.get('latest');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const color = searchParams.get('color');
    const size = searchParams.get('size');
    const colors = searchParams.get('colors');
    const sizes = searchParams.get('sizes');
    const sale = searchParams.get('sale');
    const inStock = searchParams.get('inStock');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);

    const where: any = {};

    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (gender) where.gender = { equals: gender, mode: 'insensitive' };
    if (subCategory) where.subCategory = { equals: subCategory, mode: 'insensitive' };
    if (featured === 'true') where.featured = true;
    if (latest === 'true') where.latestArrival = true;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    // Seller products are only publicly visible once approved. Platform products
    // are always APPROVED by default, so they are unaffected. Inactive products
    // are hidden from the public catalog/search/recommendations (admins and
    // sellers manage products through their own scoped APIs).
    const and: any[] = [
      { isActive: true },
      {
        OR: [{ productOwnerType: 'PLATFORM' }, { approvalStatus: 'APPROVED' }],
      },
    ];

    // Legacy single-value filters (backward compatible with SearchOverlay, etc.).
    if (color) and.push({ colors: { has: color } });
    if (size) and.push({ sizes: { has: size } });

    // Multi-value filters (comma separated, OR semantics) — keep pagination/counts correct.
    if (colors) {
      const list = colors.split(',').map((c) => c.trim()).filter(Boolean);
      if (list.length > 0) {
        and.push({ OR: list.map((c) => ({ colors: { has: c } })) });
      }
    }
    if (sizes) {
      const list = sizes.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) {
        and.push({ OR: list.map((s) => ({ sizes: { has: s } })) });
      }
    }

    if (sale === 'true') {
      and.push({ oldPrice: { not: null } });
    }

    // Availability filter: "in" = only items with stock available (stock > 0).
    // Nothing (missing) = all (the stock value is never shown as exact quantity
    // beyond the existing low-stock affordance; availability is what we gate on).
    if (inStock === 'true') {
      and.push({ stock: { gt: 0 } });
    }

    where.AND = and;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { subCategory: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price-asc':
        orderBy = { price: 'asc' };
        break;
      case 'price-desc':
        orderBy = { price: 'desc' };
        break;
      case 'name-asc':
        orderBy = { name: 'asc' };
        break;
      case 'name-desc':
        orderBy = { name: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          seller: {
            select: { id: true, storeName: true, storeSlug: true, logo: true, approvalStatus: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const normalized = products.map((p: any) => ({
      ...p,
      images: normalizeImages(p.images),
      colorImages: normalizeColorImages(p.colorImages),
      sellerInfo: p.seller
        ? {
            id: p.seller.id,
            storeName: p.seller.storeName,
            storeSlug: p.seller.storeSlug,
            logo: p.seller.logo,
            approved: p.seller.approvalStatus === "APPROVED",
          }
        : null,
    }));

    return NextResponse.json({
      products: normalized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ products: [], total: 0, page: 1, limit: 24, totalPages: 0 }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();

    if (!body.name || !body.price || !body.category || !body.gender) {
      return NextResponse.json(
        { error: 'Please fill in all required fields: name, price, category, gender' },
        { status: 400 }
      );
    }

    if (typeof body.price !== 'number' || body.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    let slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    try {
      let existing = await prisma.product.findUnique({ where: { slug } });
      let counter = 1;
      while (existing) {
        slug = `${body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${counter}`;
        existing = await prisma.product.findUnique({ where: { slug } });
        counter++;
      }
    } catch {}

    const baseProductData = {
      name: body.name,
      slug,
      description: body.description || '',
      price: body.price,
      oldPrice: body.oldPrice || null,
      category: body.category,
      subCategory: body.subCategory || null,
      gender: body.gender,
      sizes: body.sizes || [],
      colors: body.colors || [],
      images: body.images && body.images.length > 0 ? body.images : ['/images/placeholder.jpg'],
      colorImages: body.colorImages || {},
      stock: body.stock || 0,
      badge: body.badge || null,
      featured: body.featured || false,
      latestArrival: body.latestArrival || false,
      isActive: body.isActive !== undefined ? body.isActive : true,
    };

    let sku: string | null = body.sku ? String(body.sku).trim() : null;
    let product;
    for (let attempt = 0; ; attempt++) {
      try {
        product = await prisma.product.create({ data: { ...baseProductData, sku } });
        break;
      } catch (err) {
        const isSkuConflict =
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === 'P2002' &&
          Array.isArray((err as { meta?: { target?: unknown } }).meta?.target) &&
          ((err as { meta?: { target?: Array<string> } }).meta?.target ?? []).includes('sku');
        if (!isSkuConflict || attempt >= 5) throw err;
        const base = (body.sku ? String(body.sku).trim() : `${body.name}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'product';
        sku = `${base}-${Date.now().toString(36)}${attempt}`;
      }
    }
    await notifyAdmin({
      type: "product",
      title: "Product Created",
      message: `"${product.name}" has been added to your catalog.`,
      link: `/admin/products/${product.id}`,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create product: ${errorMessage}` },
      { status: 500 }
    );
  }
}
