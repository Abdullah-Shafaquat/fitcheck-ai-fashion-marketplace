import { NextRequest, NextResponse } from "next/server";
import { prismaQuery } from "@/lib/prisma";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const data = await prismaQuery(async (p) => {
      const [totalProducts, activeProducts, featuredProducts, latestProducts, categories, genderCounts, lowStockProducts] =
        await Promise.all([
          p.product.count(),
          p.product.count({ where: { isActive: true } }),
          p.product.count({ where: { featured: true } }),
          p.product.count({ where: { latestArrival: true } }),
          p.product.groupBy({ by: ["category"], _count: true }),
          p.product.groupBy({ by: ["gender"], _count: true }),
          p.product.findMany({ where: { stock: { lt: 10 } }, select: { id: true, name: true, stock: true, slug: true }, orderBy: { stock: "asc" }, take: 5 }),
        ]);

      const totalStock = await p.product.aggregate({ _sum: { stock: true } });
      const avgPrice = await p.product.aggregate({ _avg: { price: true } });
      const totalValue = await p.product.aggregate({ _sum: { price: true }, where: { isActive: true } });

      const reviewsAgg = await p.review.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
      });

      return {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        featuredProducts,
        latestProducts,
        totalStock: totalStock._sum.stock || 0,
        averagePrice: avgPrice._avg.price || 0,
        catalogValue: totalValue._sum.price || 0,
        averageRating: Math.round((reviewsAgg._avg.rating || 0) * 10) / 10,
        totalReviews: reviewsAgg._count.rating,
        categories: categories.map((c) => ({ name: c.category, count: c._count })),
        genderDistribution: genderCounts.map((g) => ({ name: g.gender, count: g._count })),
        lowStockProducts,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { totalProducts: 0, activeProducts: 0, inactiveProducts: 0, featuredProducts: 0, latestProducts: 0, totalStock: 0, averagePrice: 0, catalogValue: 0, averageRating: 0, totalReviews: 0, categories: [], genderDistribution: [], lowStockProducts: [] },
      { status: 200 }
    );
  }
}
