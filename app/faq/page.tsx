"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const faqs = [
  { q: "How do I track my order?", a: "Once your order ships, you'll receive an email with a tracking number. You can use this number on our Track Order page or the carrier's website to monitor your delivery." },
  { q: "What is your return policy?", a: "We offer a 30-day return policy. Items must be unworn, unwashed, and in original packaging. Visit our Returns page for step-by-step instructions." },
  { q: "How long does shipping take?", a: "Standard shipping takes 3-7 business days within Pakistan. Express shipping delivers in 1-3 business days. International shipping varies by destination." },
  { q: "Do you offer international shipping?", a: "Yes! We ship to over 50 countries. Shipping costs and delivery times vary by location. You'll see the available options at checkout." },
  { q: "How do I find my size?", a: "Check our Size Guide for detailed measurements. Each product page also includes specific sizing information. If you're between sizes, we recommend sizing up." },
  { q: "Can I exchange an item?", a: "Yes, exchanges are available within 30 days. Contact our support team to initiate an exchange for a different size, color, or item." },
  { q: "What payment methods do you accept?", a: "We accept Visa, Mastercard, PayPal, Apple Pay, Google Pay, and bank transfers. All payments are securely processed." },
  { q: "How do I create an account?", a: "Click the Register link in the header. Fill in your details and you'll be ready to shop. Account holders enjoy faster checkout and order tracking." },
  { q: "Are there any discount codes available?", a: "Subscribe to our newsletter for exclusive offers and discount codes. We also run seasonal sales throughout the year." },
  { q: "How do I contact customer support?", a: "You can reach us via email at support@fitcheck.com, call +92 300 1234567, or use our live chat feature during business hours." },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Frequently Asked Questions</h1>
          <p className="text-gray-500 mt-2 text-sm">Find answers to common questions</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-secondary pr-4">{faq.q}</span>
                {openIndex === i ? (
                  <FiChevronUp size={18} className="text-primary flex-shrink-0" />
                ) : (
                  <FiChevronDown size={18} className="text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
