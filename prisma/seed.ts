import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Test Seller (approved, real auth). Used to manually test the approved-seller
// dashboard, seller login, and admin "approve" gating for the marketplace.
// ---------------------------------------------------------------------------
const TEST_SELLER = {
  email: 'testseller@fitcheck.test',
  password: 'TestSeller@123',
  name: 'Test Seller',
  storeName: 'Test Seller Store',
  storeSlug: 'test-seller-store',
  ownerName: 'Test Seller',
  phone: '+92 300 1234567',
  businessType: 'Apparel & Fashion',
  description: 'A verified test seller store created for testing the marketplace.',
  city: 'Karachi',
  province: 'Sindh',
  country: 'Pakistan',
  commissionRate: 5,
};

const products = [
  // Existing products...
  {
    id: "product-1",
    name: "Premium Oversized Hoodie",
    slug: "premium-oversized-hoodie",
    description: "Premium oversized hoodie for ultimate comfort.",
    price: 59.99,
    oldPrice: 79.99,
    category: "Clothing",
    subCategory: "Hoodies",
    gender: "Unisex",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Gray"],
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 50,
    sku: "FC-HOOD-001",
    rating: 4.8,
    reviews: 45,
    badge: "Featured",
    featured: true,
    latestArrival: true,
    isActive: true,
  },
  {
    id: "product-2",
    name: "Classic Navy Shirt",
    slug: "classic-navy-shirt",
    description: "Classic navy shirt for formal occasions.",
    price: 39.99,
    oldPrice: 59.99,
    category: "Clothing",
    subCategory: "Shirts",
    gender: "Men",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy", "White"],
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 30,
    sku: "FC-SHRT-002",
    rating: 4.5,
    reviews: 28,
    badge: "Best Seller",
    featured: false,
    latestArrival: false,
    isActive: true,
  },
  {
    id: "product-3",
    name: "Relaxed Fit Jeans",
    slug: "relaxed-fit-jeans",
    description: "Comfortable relaxed fit jeans for everyday wear.",
    price: 64.99,
    oldPrice: null,
    category: "Clothing",
    subCategory: "Jeans",
    gender: "Men",
    sizes: ["30", "32", "34", "36"],
    colors: ["Blue", "Black"],
    images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 25,
    sku: "FC-JEAN-003",
    rating: 4.2,
    reviews: 19,
    badge: "None",
    featured: false,
    latestArrival: true,
    isActive: true,
  },
  {
    id: "product-4",
    name: "Minimal White Sneakers",
    slug: "minimal-white-sneakers",
    description: "Clean minimal white sneakers for everyday style.",
    price: 89.99,
    oldPrice: 119.99,
    category: "Shoes",
    subCategory: "Sneakers",
    gender: "Unisex",
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["White"],
    images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 40,
    sku: "FC-SNK-004",
    rating: 4.9,
    reviews: 52,
    badge: "Best Seller",
    featured: true,
    latestArrival: false,
    isActive: true,
  },
  {
    id: "product-5",
    name: "Women's Cream Jacket",
    slug: "womens-cream-jacket",
    description: "Elegant cream jacket for women.",
    price: 74.99,
    oldPrice: null,
    category: "Clothing",
    subCategory: "Jackets",
    gender: "Women",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Cream", "Beige"],
    images: ["https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 15,
    sku: "FC-JKT-005",
    rating: 4.6,
    reviews: 22,
    badge: "Editor's Pick",
    featured: false,
    latestArrival: true,
    isActive: true,
  },
  {
    id: "product-6",
    name: "Modern Cargo Pants",
    slug: "modern-cargo-pants",
    description: "Modern cargo pants with multiple pockets.",
    price: 69.99,
    oldPrice: 89.99,
    category: "Clothing",
    subCategory: "Trousers",
    gender: "Men",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Khaki", "Olive"],
    images: ["https://images.unsplash.com/photo-1584865288642-42078afe6942?auto=format&fit=crop&w=800&h=1000&q=80"],
    stock: 20,
    sku: "FC-CRGO-006",
    rating: 4.3,
    reviews: 16,
    badge: "Trending",
    featured: false,
    latestArrival: false,
    isActive: true,
  },
];

async function seedTestSeller() {
  const {
    email,
    password,
    name,
    storeName,
    storeSlug,
    ownerName,
    phone,
    businessType,
    description,
    city,
    province,
    country,
    commissionRate,
  } = TEST_SELLER;

  const passwordHash = await hash(password, 12);

  // Upsert the customer/owner account (this is also the seller's login account).
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'SELLER',
      passwordHash,
      accountStatus: 'ACTIVE',
      forcePasswordReset: false,
    },
    create: {
      email,
      name,
      passwordHash,
      provider: 'email',
      role: 'SELLER',
      accountStatus: 'ACTIVE',
    },
  });

  // Upsert the seller profile as APPROVED.
  const seller = await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    update: {
      approvalStatus: 'APPROVED',
      verificationStatus: 'VERIFIED',
      approvedAt: new Date(),
      approvedBy: 'seed',
      rejectionReason: null,
      blockedAt: null,
      blockReason: null,
      blockReasonDetails: null,
      commissionRate,
    },
    create: {
      userId: user.id,
      storeName,
      storeSlug,
      ownerName,
      email,
      phone,
      businessType,
      description,
      city,
      province,
      country,
      approvalStatus: 'APPROVED',
      verificationStatus: 'VERIFIED',
      approvedAt: new Date(),
      approvedBy: 'seed',
      commissionRate,
    },
  });

  // Seed a fully-verified identity verification record so the approved status
  // is consistent with the verification pipeline (all three items VERIFIED).
  await prisma.sellerVerification.upsert({
    where: { sellerId: seller.id },
    update: {
      cnicNumber: '42101-1234567-1',
      cnicFrontPath: null,
      cnicBackPath: null,
      verificationImages: [],
      liveVideoPath: null,
      cnicStatus: 'VERIFIED',
      cnicReviewedAt: new Date(),
      imagesStatus: 'VERIFIED',
      imagesReviewedAt: new Date(),
      videoStatus: 'VERIFIED',
      videoReviewedAt: new Date(),
      submittedAt: new Date(),
      lastReviewedBy: 'seed',
    },
    create: {
      sellerId: seller.id,
      cnicNumber: '42101-1234567-1',
      cnicFrontPath: null,
      cnicBackPath: null,
      verificationImages: [],
      liveVideoPath: null,
      cnicStatus: 'VERIFIED',
      cnicReviewedAt: new Date(),
      imagesStatus: 'VERIFIED',
      imagesReviewedAt: new Date(),
      videoStatus: 'VERIFIED',
      videoReviewedAt: new Date(),
      submittedAt: new Date(),
      lastReviewedBy: 'seed',
    },
  });

  // If the store slug collides with another store, back off.
  const taken = await prisma.sellerProfile.findUnique({ where: { storeSlug } });
  if (taken && taken.userId !== user.id) {
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { storeSlug: `${storeSlug}-2` },
    });
  }

  console.log('✅ Seeded test seller:');
  console.log(`   Store: ${storeName} (${storeSlug})`);
  console.log(`   Login email: ${email}`);
  console.log(`   Login password: ${password}`);
}

async function main() {
  console.log('🌱 Seeding database...');
  
  for (const product of products) {
    try {
      await prisma.product.upsert({
        where: { id: product.id },
        update: product,
        create: product,
      });
      console.log(`✅ Upserted: ${product.name}`);
    } catch (error) {
      console.error(`❌ Failed to upsert ${product.name}:`, error);
    }
  }

  await seedTestSeller();
  
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });