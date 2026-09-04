import Link from "next/link";

export const metadata = {
  title: "Sitemap | FitCheck",
  description: "Browse all pages on the FitCheck website.",
};

const groups: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { name: "All Products", href: "/shop" },
      { name: "Men", href: "/men" },
      { name: "Women", href: "/women" },
      { name: "Kids", href: "/kids" },
      { name: "Clothing", href: "/clothing" },
      { name: "Shoes", href: "/shoes" },
      { name: "Accessories", href: "/accessories" },
      { name: "New Arrivals", href: "/new-arrivals" },
      { name: "Sale", href: "/sale" },
      { name: "Dresses", href: "/dresses" },
      { name: "T-Shirts", href: "/t-shirts" },
      { name: "Jeans", href: "/jeans" },
      { name: "Jackets & Coats", href: "/jackets-coats" },
      { name: "Hoodies & Sweatshirts", href: "/hoodies-sweatshirts" },
      { name: "Activewear", href: "/activewear" },
      { name: "Bags", href: "/bags" },
      { name: "Watches", href: "/watches" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { name: "Contact Us", href: "/contact" },
      { name: "Shipping & Delivery", href: "/shipping" },
      { name: "Returns & Exchanges", href: "/returns" },
      { name: "Size Guide", href: "/size-guide" },
      { name: "FAQ", href: "/faq" },
      { name: "Track Order", href: "/track-order" },
      { name: "My Orders", href: "/orders" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Our Story", href: "/our-story" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms & Conditions", href: "/terms" },
      { name: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Account",
    links: [
      { name: "Sign In", href: "/login" },
      { name: "Create Account", href: "/register" },
      { name: "Wishlist", href: "/wishlist" },
      { name: "Cart", href: "/cart" },
    ],
  },
];

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Checkout", href: "/checkout" },
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Sitemap</h1>
          <p className="text-gray-500 mt-2 text-sm">
            All the pages on FitCheck, organized for easy navigation.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4">
                {group.title}
              </h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-4">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
