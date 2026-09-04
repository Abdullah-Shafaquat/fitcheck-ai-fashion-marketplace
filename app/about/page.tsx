import Link from "next/link";
import { FiMapPin, FiMail, FiPhone, FiClock, FiTarget, FiHeart, FiGlobe, FiAward } from "react-icons/fi";

export const metadata = {
  title: "About Us | FitCheck",
  description: "Learn about FitCheck - your destination for modern fashion and clothing.",
};

const values = [
  {
    icon: FiTarget,
    title: "Quality First",
    description: "Every piece is crafted with attention to detail and made to last beyond seasons. We source premium fabrics and work with skilled artisans to deliver exceptional quality.",
  },
  {
    icon: FiHeart,
    title: "Style for Everyone",
    description: "Fashion is personal. We offer diverse styles from casual streetwear to polished essentials so everyone can find their perfect fit.",
  },
  {
    icon: FiGlobe,
    title: "Sustainable Future",
    description: "We're committed to responsible sourcing, ethical manufacturing, and reducing our environmental footprint. Fashion that feels good and does good.",
  },
  {
    icon: FiAward,
    title: "Customer Obsessed",
    description: "Your satisfaction is our priority. From easy returns to dedicated support, we build every experience around you.",
  },
];

const stats = [
  { number: "50K+", label: "Happy Customers" },
  { number: "2000+", label: "Products" },
  { number: "50+", label: "Countries Served" },
  { number: "4.8", label: "Average Rating" },
];

const team = [
  { name: "Ahmed Khan", role: "Founder & CEO", description: "Passionate about making fashion accessible to everyone." },
  { name: "Sara Ali", role: "Head of Design", description: "Creates collections that blend trends with timeless style." },
  { name: "Bilal Ahmed", role: "Operations Lead", description: "Ensures every order reaches you perfectly and on time." },
  { name: "Fatima Noor", role: "Customer Experience", description: "Dedicated to making every interaction exceptional." },
];

const milestones = [
  { year: "2024", title: "The Beginning", description: "FitCheck launched from a small apartment in Karachi with a vision to revolutionize online fashion shopping in Pakistan." },
  { year: "2024", title: "First 1,000 Orders", description: "Reached our first milestone within 6 months, proving that customers loved our quality and style." },
  { year: "2025", title: "Expanded Collections", description: "Launched Kids, Accessories, and Activewear lines. Introduced Safepay for secure checkout." },
  { year: "2025", title: "Google OAuth & Notifications", description: "Enhanced user experience with Google Sign-In and real-time order notifications." },
  { year: "2026", title: "Global Reach", description: "Now serving customers in 50+ countries with free international shipping on select orders." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">Our Story</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Fashion That <span className="text-primary">Fits</span> Your Life
            </h1>
            <p className="text-gray-400 mt-4 text-lg leading-relaxed max-w-xl">
              From a small idea in Karachi to a global fashion destination — FitCheck is where style meets comfort, and every customer is family.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-primary">{stat.number}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-5xl mx-auto space-y-20">
          {/* Story */}
          <section>
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Who We Are</p>
              <h2 className="text-3xl font-extrabold text-secondary mb-6">Our Story</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>
                  FitCheck was born from a simple idea: fashion should be accessible, exciting, and effortless. Founded in 2024 in Karachi, Pakistan, we set out to create a shopping experience that combines the latest trends with everyday comfort.
                </p>
                <p>
                  What started as a small online boutique has grown into a full-scale fashion destination, serving thousands of customers across 50+ countries who believe that looking good shouldn&apos;t break the bank.
                </p>
                <p>
                  Our curated collections span men&apos;s, women&apos;s, and kids&apos; fashion — from casual streetwear to polished essentials. Every piece is designed with you in mind.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-6xl font-extrabold text-primary">FC</p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">Est. 2024</p>
                  <p className="text-xs text-gray-400 mt-1">Karachi, Pakistan</p>
                </div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">What Drives Us</p>
              <h2 className="text-3xl font-extrabold text-secondary">Our Values</h2>
              <p className="text-sm text-gray-500 mt-3">The principles that guide every decision we make</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div key={value.title} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors duration-300">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon size={22} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary mb-2">{value.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Team */}
          <section>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">The People</p>
              <h2 className="text-3xl font-extrabold text-secondary">Meet Our Team</h2>
              <p className="text-sm text-gray-500 mt-3">The passionate people behind FitCheck</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member) => (
                <div key={member.name} className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow duration-300">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{member.name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <h3 className="text-sm font-bold text-secondary">{member.name}</h3>
                  <p className="text-xs text-primary font-semibold mt-1">{member.role}</p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{member.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Milestones */}
          <section>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Our Journey</p>
              <h2 className="text-3xl font-extrabold text-secondary">Milestones</h2>
              <p className="text-sm text-gray-500 mt-3">Key moments that shaped who we are</p>
            </div>
            <div className="space-y-6">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{m.year}</span>
                    </div>
                    {i < milestones.length - 1 && <div className="w-px h-6 bg-gray-200 mt-2" />}
                  </div>
                  <div className="pb-6">
                    <h3 className="text-sm font-bold text-secondary">{m.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Reach Out</p>
              <h2 className="text-3xl font-extrabold text-secondary">Get in Touch</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: FiMapPin, label: "Visit Us", value: "FitCheck Fashion Store\nKarachi, Pakistan" },
                { icon: FiMail, label: "Email Us", value: "support@fitcheck.com" },
                { icon: FiPhone, label: "Call Us", value: "+92 300 1234567" },
                { icon: FiClock, label: "Working Hours", value: "Mon - Sat: 10AM - 8PM" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-secondary">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 md:p-14">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">Ready to Shop?</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">Explore our latest collections and find your perfect fit. Fashion that&apos;s made for you.</p>
            <Link href="/shop" className="inline-block px-10 py-3.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
              Shop Now
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
