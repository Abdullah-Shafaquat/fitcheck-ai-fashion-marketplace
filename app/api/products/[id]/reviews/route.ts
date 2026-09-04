import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Only surface reviews for publicly visible products (same predicate used
    // everywhere public product data is served). This is authoritative; without
    // it reviews could be enumerated for inactive/unapproved products.
    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ productOwnerType: "PLATFORM" }, { approvalStatus: "APPROVED" }],
      },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ reviews: [] }, { status: 404 });
    }

    const reviews = await prisma.review.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews", reviews: [] }, { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCustomer(req);
    if (auth.response) return auth.response;
    const user = auth.user;

    const { id } = await params;
    const body = await req.json();

    const rating = Math.round(Number(body.rating));
    const comment = (body.comment || "").trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }
    if (!comment || comment.length < 4) {
      return NextResponse.json({ error: "Review comment is too short" }, { status: 400 });
    }

    // Reviews may only be submitted on publicly visible products; a hidden
    // product (inactive, or seller-owned and not APPROVED) cannot be reviewed.
    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ productOwnerType: "PLATFORM" }, { approvalStatus: "APPROVED" }],
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const author = (user?.name as string) || (body.author || "").trim();
    if (!author || author.length < 2) {
      return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: { productId: id, author, rating, comment },
    });

    const aggregate = await prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id },
      data: {
        rating: Math.round((aggregate._avg.rating || rating) * 10) / 10,
        reviews: aggregate._count.rating,
      },
    });

    return NextResponse.json(
      {
        review,
        productRating: Math.round((aggregate._avg.rating || rating) * 10) / 10,
        productReviewCount: aggregate._count.rating,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}