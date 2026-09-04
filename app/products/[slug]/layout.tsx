import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Public-visibility rule used across the storefront: a platform product is
 * public, or a seller product once approved AND active. Anything else
 * (DRAFT / PENDING_REVIEW / REJECTED / inactive) is private to the seller and
 * admin and must not be indexed. We follow the same predicate here so SEO never
 * leaks unapproved/inactive product pages (they resolve 404/noindex instead).
 */
function isPublicProduct(p: {
  isActive: boolean;
  productOwnerType: string;
  approvalStatus: string;
}): boolean {
  if (!p.isActive) return false;
  return p.productOwnerType === "PLATFORM" || p.approvalStatus === "APPROVED";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let product: {
    name: string;
    description: string | null;
    category: string;
    subCategory: string | null;
    images: string[];
    isActive: boolean;
    productOwnerType: string;
    approvalStatus: string;
  } | null = null;

  try {
    product = await prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        category: true,
        subCategory: true,
        images: true,
        isActive: true,
        productOwnerType: true,
        approvalStatus: true,
      },
    });
  } catch {
    product = null;
  }

  if (!product || !isPublicProduct(product)) {
    return {
      title: "Product Not Available",
      description: "This product is no longer available at FitCheck.",
      robots: { index: false, follow: true },
    };
  }

  const base = siteUrl();
  const title = product.name;
  const description =
    (product.description || "").slice(0, 158) ||
    `Shop ${product.name} at FitCheck${product.category ? ` — ${product.category}` : ""}.`;
  const image = product.images?.[0] || "/logos/top-logo.png";
  const url = `${base}/products/${slug}`;

  const keywords = [
    product.name,
    product.category,
    product.subCategory,
    "FitCheck",
  ].filter((k): k is string => Boolean(k));

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [{ url: image, alt: product.name }],
      siteName: "FitCheck",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
