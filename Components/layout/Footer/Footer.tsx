"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiMapPin, 
  FiMail, 
  FiPhone, 
  FiMessageCircle,
  FiSend,
  FiInstagram,
  FiFacebook,
  FiYoutube,
  FiTwitter,
  FiArrowUp,
  FiHeart
} from 'react-icons/fi';
import { FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { 
  SiVisa, 
  SiMastercard, 
  SiPaypal,
  SiApplepay,
  SiGooglepay
  // SiAmex removed - not available in react-icons
} from 'react-icons/si';
import { BsCreditCard } from 'react-icons/bs'; // Alternative for Amex

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const shopLinks = [
    { name: "Men", href: "/men" },
    { name: "Women", href: "/women" },
    { name: "Kids", href: "/kids" },
    { name: "New Arrivals", href: "/new-arrivals" },
    { name: "Clothing", href: "/clothing" },
    { name: "Shoes", href: "/shoes" },
    { name: "Accessories", href: "/accessories" },
    { name: "Sale", href: "/sale" },
  ];

  const customerServiceLinks = [
    { name: "Contact Us", href: "/contact" },
    { name: "Shipping & Delivery", href: "/shipping" },
    { name: "Returns & Exchanges", href: "/returns" },
    { name: "Size Guide", href: "/size-guide" },
    { name: "FAQ", href: "/faq" },
    { name: "Track Order", href: "/track-order" },
  ];

  const aboutLinks = [
    { name: "About Us", href: "/about" },
    { name: "Our Story", href: "/our-story" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Careers", href: "/careers" },
  ];

  const socialLinks = [
    { icon: FiInstagram, href: "https://instagram.com", label: "Instagram", color: "hover:text-pink-500" },
    { icon: FiFacebook, href: "https://facebook.com", label: "Facebook", color: "hover:text-blue-600" },
    { icon: FaTiktok, href: "https://tiktok.com", label: "TikTok", color: "hover:text-black" },
    { icon: FiYoutube, href: "https://youtube.com", label: "YouTube", color: "hover:text-red-600" },
    { icon: FiTwitter, href: "https://twitter.com", label: "Twitter", color: "hover:text-blue-400" },
    { icon: FaWhatsapp, href: "https://wa.me/923001234567", label: "WhatsApp", color: "hover:text-green-500" },
  ];

  const paymentMethods = [
    { icon: SiVisa, label: "Visa" },
    { icon: SiMastercard, label: "Mastercard" },
    { icon: SiPaypal, label: "PayPal" },
    { icon: SiApplepay, label: "Apple Pay" },
    { icon: SiGooglepay, label: "Google Pay" },
    { icon: BsCreditCard, label: "Amex" }, // Using BsCreditCard as alternative
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  return (
    <footer className="w-full bg-secondary text-white/80 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/5 rounded-full" />
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-3 sm:px-4 pt-12 sm:pt-16 pb-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 sm:gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="block mb-4">
              <span className="text-3xl font-extrabold tracking-tighter text-white select-none">
                FIT<span className="text-primary">CHECK</span>
              </span>
            </Link>
            <p className="text-sm text-white/40 mb-4 tracking-wider">
              Modern style. Better fit.
            </p>
            <p className="text-xs text-white/30 max-w-xs leading-relaxed">
              Your destination for premium fashion. Discover curated collections that define modern style.
            </p>

            {/* Contact */}
            <div className="space-y-3 mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
                Contact Us
              </h4>
              <div className="flex items-start gap-3 text-xs text-white/50 hover:text-white/80 transition-colors duration-300">
                <FiMapPin className="text-primary mt-0.5 flex-shrink-0" size={16} />
                <span>FitCheck Fashion Store<br />Karachi, Pakistan</span>
              </div>
              <Link href="mailto:support@fitcheck.com" className="flex items-center gap-3 text-xs text-white/50 hover:text-white/80 transition-colors duration-300 group">
                <FiMail className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" size={16} />
                <span>support@fitcheck.com</span>
              </Link>
              <Link href="tel:+923001234567" className="flex items-center gap-3 text-xs text-white/50 hover:text-white/80 transition-colors duration-300 group">
                <FiPhone className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" size={16} />
                <span>+92 300 1234567</span>
              </Link>
              <Link href="/contact" className="flex items-center gap-3 text-xs text-white/50 hover:text-white/80 transition-colors duration-300 group">
                <FiMessageCircle className="text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" size={16} />
                <span>Live Chat</span>
              </Link>
            </div>

            {/* Social Icons */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
                Follow Us
              </h4>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className={`w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 ${social.color} transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/10`}
                    >
                      <Icon size={17} />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">
              Shop
            </h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/50 hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">
              Customer Service
            </h4>
            <ul className="space-y-2.5">
              {customerServiceLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/50 hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-4">
              About FitCheck
            </h4>
            <ul className="space-y-2.5">
              {aboutLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/50 hover:text-primary transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
              Stay in the Style Loop
            </h4>
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Get the latest arrivals, exclusive offers, and fashion updates.
            </p>

            <form onSubmit={handleSubscribe} className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-300"
                required
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-primary/30"
                aria-label="Subscribe"
              >
                <FiSend size={18} />
              </button>
            </form>

            {isSubscribed && (
              <p className="text-xs text-green-400 mt-2 animate-slideDown">
                ✓ Subscribed successfully!
              </p>
            )}
            <p className="text-[10px] text-white/20 mt-3">
              No spam. Unsubscribe anytime.
            </p>

            {/* Trust Badge */}
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <FiHeart className="text-primary" size={14} />
                <p className="text-[10px] text-white/40">
                  Trusted by 10,000+ customers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] sm:text-xs text-white/30 text-center sm:text-left">
              © 2026 FitCheck. All rights reserved.
            </p>

            <div className="flex items-center gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.label}
                    className="text-white/20 hover:text-primary/60 transition-colors duration-300"
                    aria-label={method.label}
                  >
                    <Icon size={20} />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-[10px] text-white/30 hover:text-white/60 transition-colors duration-200">
                Privacy
              </Link>
              <span className="w-px h-3 bg-white/10" />
              <Link href="/terms" className="text-[10px] text-white/30 hover:text-white/60 transition-colors duration-200">
                Terms
              </Link>
              <span className="w-px h-3 bg-white/10" />
              <Link href="/sitemap" className="text-[10px] text-white/30 hover:text-white/60 transition-colors duration-200">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-110 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 animate-fadeIn"
          aria-label="Scroll to top"
        >
          <FiArrowUp size={20} />
        </button>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slideDown, .animate-fadeIn {
            animation: none;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;