"use client";

import "./globals.css";
import { IoAlertCircleOutline, IoRefreshOutline } from "react-icons/io5";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 440, padding: "2rem" }}>
            <div
              style={{
                width: 88,
                height: 88,
                margin: "0 auto 2rem",
                borderRadius: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#1F1F1F",
                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
              }}
            >
              <IoAlertCircleOutline size={40} color="#FF6B35" />
            </div>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#FF6B35",
                marginBottom: 10,
              }}
            >
              Critical error
            </p>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#1F1F1F",
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
              }}
            >
              FitCheck hit an unexpected error
            </h1>
            <p style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.6, margin: "0 0 24px" }}>
              Something broke at the app level. Refresh to get back to the
              runway.
            </p>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: "0.75rem",
                backgroundColor: "#FF6B35",
                color: "#fff",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <IoRefreshOutline size={15} />
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}