"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiMail, FiLock, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";
import { readIntendedDestination } from "@/lib/redirect";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If the visitor is already signed in, send them straight to their
    // intended destination instead of showing the login form again.
    try {
      if (localStorage.getItem("fitcheck-user")) {
        router.replace(readIntendedDestination());
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "error") {
      setError("Google Sign-In could not be completed. Please try again.");
      window.history.replaceState({}, "", "/login");
    }
    if (params.get("google") === "blocked") {
      setError(
        "This account is not eligible to sign in. Please contact support if you believe this is an error."
      );
      window.history.replaceState({}, "", "/login");
    }
    if (params.get("reset") === "success") {
      setError("");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const handleGoogle = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setError("Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    const dest = readIntendedDestination();
    const q = dest === "/" ? "" : `?redirect=${encodeURIComponent(dest)}`;
    window.location.href = `/api/auth/google${q}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }
      localStorage.setItem("fitcheck-user", JSON.stringify(data.user));
      setLoading(false);
      if (data.requiresPasswordReset) {
        router.push("/account/reset-password");
        return;
      }
      router.push(readIntendedDestination());
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#111111] overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FF6B35]/[0.06] blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logos/top-logo.png"
              alt="FitCheck"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
            />
            <span className="text-white text-xl font-bold tracking-tight">
              FitCheck
            </span>
          </Link>

          {/* Center message */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Your style
              <br />
              <span className="text-[#FF6B35]">starts here.</span>
            </h2>
            <p className="text-white/30 text-sm leading-relaxed">
              Sign in to access your orders, wishlist, and personalized
              recommendations. Pick up right where you left off.
            </p>

            {/* Floating stats */}
            <div className="flex gap-8 mt-10">
              {[
                { value: "10K+", label: "Products" },
                { value: "50K+", label: "Happy Customers" },
                { value: "4.9", label: "Average Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-white font-bold text-lg">{stat.value}</p>
                  <p className="text-white/20 text-[11px] font-medium tracking-wide uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-white/10 text-[10px] tracking-widest uppercase">
            FitCheck &mdash; Fashion Forward &bull; &copy; 2026
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/logos/main-logo.png"
                alt="FitCheck"
                width={140}
                height={40}
                className="h-auto"
                priority
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-[2rem] font-bold text-[#1F1F1F] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Sign in to your FitCheck account and continue your style journey.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block"
              >
                Email Address
              </label>
              <div className="relative">
                <FiMail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-[#1F1F1F] border border-gray-200 rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block"
              >
                Password
              </label>
              <div className="relative">
                <FiLock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-12 py-3.5 text-sm text-[#1F1F1F] border border-gray-200 rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <FiEyeOff size={16} />
                  ) : (
                    <FiEye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 rounded border border-gray-200 bg-white peer-checked:bg-[#FF6B35] peer-checked:border-[#FF6B35] transition-all duration-200 flex items-center justify-center">
                    {remember && (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        className="text-white"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-xs text-[#FF6B35] hover:text-[#e05a2b] font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? (
                <>
                  <FiLoader size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] text-gray-700 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
          >
            {googleLoading ? (
              <FiLoader size={16} className="animate-spin text-gray-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Footer link */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#FF6B35] hover:text-[#e05a2b] font-semibold transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
