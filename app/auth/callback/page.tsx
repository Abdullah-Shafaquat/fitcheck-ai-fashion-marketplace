"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLoader } from "react-icons/fi";
import { readIntendedDestination, safeReturnUrl } from "@/lib/redirect";

function decodeBase64Url(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(base64);
    return decodeURIComponent(
      bin
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return "";
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("u");

    if (!encoded) {
      setError("No session data found.");
      setStatus("Something went wrong");
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }

    try {
      const user = JSON.parse(decodeBase64Url(encoded));
      if (!user || !user.email || !user.name) {
        throw new Error("Invalid user data");
      }
      localStorage.setItem("fitcheck-user", JSON.stringify(user));
      router.replace(readIntendedDestination());
    } catch {
      setError("Failed to process Google sign-in.");
      setStatus("Something went wrong");
      setTimeout(() => router.replace("/login"), 1500);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-5 flex items-center justify-center rounded-full bg-[#FF6B35]/10">
          {error ? (
            <span className="text-2xl">⚠️</span>
          ) : (
            <FiLoader size={22} className="text-[#FF6B35] animate-spin" />
          )}
        </div>
        <h1 className="text-xl font-bold text-[#1F1F1F] tracking-tight">{status}</h1>
        {error && <p className="text-sm text-gray-400 mt-2">{error}</p>}
        {!error && (
          <p className="text-xs text-gray-300 mt-2">Redirecting to FitCheck &hellip;</p>
        )}
      </div>
    </div>
  );
}