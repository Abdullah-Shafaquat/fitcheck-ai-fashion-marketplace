"use client";

import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from "react-icons/fi";

const perks = [
  {
    icon: FiTruck,
    title: "Free Shipping",
    description: "Free delivery on orders over Rs. 5,000",
  },
  {
    icon: FiShield,
    title: "Secure Payment",
    description: "100% secure checkout with Safepay",
  },
  {
    icon: FiRefreshCw,
    title: "Easy Returns",
    description: "30-day hassle-free returns & exchanges",
  },
  {
    icon: FiHeadphones,
    title: "24/7 Support",
    description: "Dedicated support team, always here to help",
  },
];

export default function TrustBadges() {
  return (
    <section className="w-full py-12 sm:py-16 bg-white border-t border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {perks.map((perk) => {
            const Icon = perk.icon;
            return (
              <div key={perk.title} className="flex flex-col items-center text-center gap-3 group">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                  <Icon size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-secondary">{perk.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{perk.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
