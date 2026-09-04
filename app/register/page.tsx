"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiCheck,
} from "react-icons/fi";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const passwordMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;
  const passwordMismatch =
    form.confirmPassword && form.password !== form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }
      localStorage.setItem("fitcheck-user", JSON.stringify(data.user));
      setLoading(false);
      router.push("/");
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "error") {
      setError("Google Sign-In could not be completed. Please try again.");
      window.history.replaceState({}, "", "/register");
    }
  }, []);

  const handleGoogle = () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setError("Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    window.location.href = "/api/auth/google";
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#FF6B35]/[0.06] blur-[120px]" />

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
              Join the
              <br />
              <span className="text-[#FF6B35]">FitCheck community.</span>
            </h2>
            <p className="text-white/30 text-sm leading-relaxed">
              Create your account to unlock personalized recommendations,
              exclusive drops, and a seamless shopping experience.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-4">
              {[
                "Personalized style recommendations",
                "Early access to new arrivals",
                "Exclusive member-only discounts",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FF6B35]/15 flex items-center justify-center flex-shrink-0">
                    <FiCheck size={10} className="text-[#FF6B35]" />
                  </div>
                  <span className="text-white/40 text-sm">{item}</span>
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
              Create Your Account
            </h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Join FitCheck and discover your perfect fit.
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
            {/* Full Name */}
            <div>
              <label
                htmlFor="reg-name"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block"
              >
                Full Name
              </label>
              <div className="relative">
                <FiUser
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                />
                <input
                  id="reg-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-[#1F1F1F] border border-gray-200 rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
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
                  id="reg-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-[#1F1F1F] border border-gray-200 rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
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
                  id="reg-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  className="w-full pl-11 pr-12 py-3.5 text-sm text-[#1F1F1F] border border-gray-200 rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
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
              {form.password && (
                <div className="mt-1.5 flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        form.password.length >= i * 3
                          ? form.password.length >= 12
                            ? "bg-emerald-400"
                            : form.password.length >= 8
                              ? "bg-amber-400"
                              : "bg-red-400"
                          : "bg-gray-100"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reg-confirm"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block"
              >
                Confirm Password
              </label>
              <div className="relative">
                <FiLock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                />
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  className={`w-full pl-11 pr-12 py-3.5 text-sm text-[#1F1F1F] border rounded-xl bg-gray-50/50 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    passwordMatch
                      ? "border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400 bg-emerald-50/30"
                      : passwordMismatch
                        ? "border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50/30"
                        : "border-gray-200 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 focus:bg-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <FiEyeOff size={16} />
                  ) : (
                    <FiEye size={16} />
                  )}
                </button>
              </div>
              {passwordMatch && (
                <p className="text-xs text-emerald-500 mt-1.5 font-medium flex items-center gap-1">
                  <FiCheck size={12} /> Passwords match
                </p>
              )}
              {passwordMismatch && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer group pt-0.5">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setError("");
                  }}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border border-gray-200 bg-white peer-checked:bg-[#FF6B35] peer-checked:border-[#FF6B35] transition-all duration-200 flex items-center justify-center">
                  {agreed && (
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
              <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors leading-relaxed">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-[#FF6B35] hover:text-[#e05a2b] font-medium"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-[#FF6B35] hover:text-[#e05a2b] font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1F1F1F] hover:bg-[#2a2a2a] active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? (
                <>
                  <FiLoader size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#FF6B35] hover:text-[#e05a2b] font-semibold transition-colors"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
