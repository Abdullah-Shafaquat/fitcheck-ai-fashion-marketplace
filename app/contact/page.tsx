"use client";

import { useState } from "react";
import { FiMapPin, FiMail, FiPhone, FiMessageCircle, FiClock, FiSend } from "react-icons/fi";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <p className="eyebrow-light mb-3">FitCheck</p>

          <h1 className="editorial-title text-4xl md:text-5xl text-secondary">Contact Us</h1>
          <p className="text-gray-500 mt-2 text-sm">We&apos;d love to hear from you. Get in touch!</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-secondary">Get in Touch</h2>
            {[
              { icon: FiMapPin, label: "Address", value: "FitCheck Fashion Store\nKarachi, Pakistan" },
              { icon: FiMail, label: "Email", value: "support@fitcheck.com" },
              { icon: FiPhone, label: "Phone", value: "+92 300 1234567" },
              { icon: FiClock, label: "Hours", value: "Mon - Sat: 10AM - 8PM" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-4">
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

            <div className="pt-4">
              <p className="text-xs font-semibold text-secondary mb-2">Live Chat</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiMessageCircle size={14} className="text-green-500" />
                Available Mon-Fri, 9AM-6PM
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 md:p-8 space-y-5">
              <h2 className="text-lg font-bold text-secondary">Send a Message</h2>

              {submitted && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
                  Thank you! We&apos;ll get back to you soon.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="text-xs font-medium text-gray-500 mb-1.5 block">Name</label>
                  <input
                    id="contact-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="text-xs font-medium text-gray-500 mb-1.5 block">Subject</label>
                <input
                  id="contact-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="text-xs font-medium text-gray-500 mb-1.5 block">Message</label>
                <textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
                />
              </div>

              <button type="submit" className="px-8 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2">
                <FiSend size={14} />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
