"use client";

import { useState } from "react";
import Reveal from "@/Components/ThreeD/Reveal";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    if (!isValidEmail(email)) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    // Simulated request — swap this for a real subscribe API call
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus("success");
    setEmail("");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <section className="w-full py-16 sm:py-24 bg-gradient-to-br from-orange-500 to-orange-600">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80 mb-3">
            Stay in the loop
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Join The FitCheck Edit
          </h2>
          <p className="mt-3 mx-auto max-w-md text-sm text-white/80">
            Get exclusive early access to new drops, offers, and style inspiration.
          </p>
        </Reveal>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="Enter your email"
            className={`flex-1 px-5 py-3.5 rounded-xl bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 transition-shadow ${
              status === "error" ? "ring-2 ring-red-300 focus:ring-red-200" : "focus:ring-white/20"
            }`}
            required
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-7 py-3.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-black transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>

        {/* Reserved-height status row so the message no longer shifts layout when it appears/disappears */}
        <div className="mt-4 h-5" aria-live="polite">
          {status === "success" && (
            <p className="text-sm font-medium text-white">✓ Subscribed successfully!</p>
          )}
          {status === "error" && (
            <p className="text-sm font-medium text-white">Please enter a valid email address.</p>
          )}
        </div>
      </div>
    </section>
  );
}
