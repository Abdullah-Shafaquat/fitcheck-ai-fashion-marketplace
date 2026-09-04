import Link from "next/link";

export const metadata = {
  title: "Our Story | FitCheck",
  description: "The journey of FitCheck — from a small idea in Karachi to a global fashion destination.",
};

const timeline = [
  {
    year: "2024",
    quarter: "Q1",
    title: "The Spark",
    description: "Two friends in Karachi noticed a gap in the online fashion market — quality clothing at fair prices, delivered with care. FitCheck was born in a small apartment with big dreams.",
    color: "bg-blue-500",
  },
  {
    year: "2024",
    quarter: "Q2",
    title: "First Collection",
    description: "Launched our debut Men's Collection — 50 carefully curated pieces. Within the first week, we received 200+ orders. The response was overwhelming.",
    color: "bg-purple-500",
  },
  {
    year: "2024",
    quarter: "Q3",
    title: "Women's Line",
    description: "Expanded to Women's Fashion. Introduced our signature comfortable fit philosophy — clothes that look great and feel even better.",
    color: "bg-pink-500",
  },
  {
    year: "2024",
    quarter: "Q4",
    title: "1,000 Orders",
    description: "Hit our first major milestone — 1,000 orders fulfilled. Customer feedback shaped our next moves: more sizes, better fabrics, faster delivery.",
    color: "bg-orange-500",
  },
  {
    year: "2025",
    quarter: "Q1",
    title: "Kids & Accessories",
    description: "Launched Kids Collection and Accessories. FitCheck became a one-stop fashion destination for the whole family.",
    color: "bg-green-500",
  },
  {
    year: "2025",
    quarter: "Q2",
    title: "Secure Payments",
    description: "Integrated Safepay for 100% secure checkout. Launched Google Sign-In for seamless account access. Trust and convenience, built in.",
    color: "bg-teal-500",
  },
  {
    year: "2025",
    quarter: "Q3",
    title: "Global Expansion",
    description: "Started shipping internationally. Customers from 30+ countries discovered FitCheck. Free shipping on orders over Rs. 5,000.",
    color: "bg-indigo-500",
  },
  {
    year: "2025",
    quarter: "Q4",
    title: "Activewear Launch",
    description: "Entered the activewear market with performance fabrics and trendy designs. Gym-to-street wear that moves with you.",
    color: "bg-red-500",
  },
  {
    year: "2026",
    quarter: "Q1",
    title: "50K Customers",
    description: "Reached 50,000 happy customers worldwide. Launched real-time order notifications and an admin dashboard for instant management.",
    color: "bg-amber-500",
  },
  {
    year: "2026",
    quarter: "Q2",
    title: "What's Next",
    description: "Sustainability initiatives, AI-powered style recommendations, and pop-up stores. The best is yet to come.",
    color: "bg-primary",
  },
];

const principles = [
  { emoji: "🎯", title: "Customer-First", text: "Every decision starts with 'How does this help our customer?'" },
  { emoji: "✨", title: "Quality Obsession", text: "We'd rather sell fewer great products than many mediocre ones." },
  { emoji: "🌍", title: "Think Global", text: "Born in Pakistan, designed for the world." },
  { emoji: "🚀", title: "Move Fast", text: "Fashion moves fast. So do we — without cutting corners." },
];

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">Est. 2024</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              The <span className="text-primary">FitCheck</span> Journey
            </h1>
            <p className="text-gray-400 mt-4 text-lg leading-relaxed max-w-xl">
              From a small apartment in Karachi to wardrobes across 50+ countries — this is how we got here.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2" />

            <div className="space-y-12">
              {timeline.map((item, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <div key={i} className="relative flex flex-col md:flex-row items-start">
                    {/* Dot */}
                    <div className={`absolute left-6 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${item.color} ring-4 ring-white z-10`} />

                    {/* Content */}
                    <div className={`w-full md:w-[calc(50%-2rem)] ml-14 md:ml-0 ${isLeft ? "md:pr-12 md:text-right" : "md:ml-auto md:pl-12"}`}>
                      <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors duration-300">
                        <div className={`flex items-center gap-2 mb-2 ${isLeft ? "md:justify-end" : ""}`}>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full text-white ${item.color}`}>
                            {item.year} {item.quarter}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-secondary">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Principles */}
          <section className="mt-20">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">How We Work</p>
              <h2 className="text-3xl font-extrabold text-secondary">Our Principles</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {principles.map((p) => (
                <div key={p.title} className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
                  <span className="text-2xl flex-shrink-0">{p.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-secondary">{p.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-20 text-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 md:p-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Be Part of the Story</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">Join thousands of customers who trust FitCheck for their everyday style.</p>
            <Link href="/shop" className="inline-block px-10 py-3.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
              Shop Now
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
