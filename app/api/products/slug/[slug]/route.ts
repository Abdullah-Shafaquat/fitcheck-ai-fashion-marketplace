import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeImages, normalizeColorImages } from '@/lib/productImages';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        OR: [{ productOwnerType: 'PLATFORM' }, { approvalStatus: 'APPROVED' }],
      },
      include: {
        seller: {
          select: { id: true, storeName: true, storeSlug: true, logo: true, approvalStatus: true },
        },
      },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const related = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        isActive: true,
        // Marketplace seller products are only recommendable once approved.
        AND: [
          {
            OR: [{ productOwnerType: 'PLATFORM' }, { approvalStatus: 'APPROVED' }],
          },
        ],
        OR: [
          { AND: [{ subCategory: product.subCategory }, { gender: product.gender }] },
          { AND: [{ category: product.category }, { gender: product.gender }] },
          { gender: product.gender },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const prioritized = related.sort((a, b) => {
      const aMatch = a.subCategory === product.subCategory && a.gender === product.gender ? 2 :
                      a.category === product.category && a.gender === product.gender ? 1 : 0;
      const bMatch = b.subCategory === product.subCategory && b.gender === product.gender ? 2 :
                      b.category === product.category && b.gender === product.gender ? 1 : 0;
      return bMatch - aMatch;
    });

    const fetched = product as any;
    const responseProduct: any = {
      ...product,
      images: normalizeImages(product.images),
      colorImages: normalizeColorImages(product.colorImages),
      sellerInfo: fetched.seller
        ? {
            id: fetched.seller.id,
            storeName: fetched.seller.storeName,
            storeSlug: fetched.seller.storeSlug,
            logo: fetched.seller.logo,
            approved: fetched.seller.approvalStatus === "APPROVED",
          }
        : null,
    };

    return NextResponse.json({ product: responseProduct, related: prioritized });
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
