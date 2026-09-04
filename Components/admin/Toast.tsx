"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToast: ToastContextValue | null = null;

export function toast(type: ToastType, message: string, duration?: number) {
  globalToast?.toast(type, message, duration);
}
export function showSuccess(message: string) { globalToast?.success(message); }
export function showError(message: string) { globalToast?.error(message); }
export function showWarning(message: string) { globalToast?.warning(message); }
export function showInfo(message: string) { globalToast?.info(message); }

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastType, React.ElementType> = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const colors: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "text-emerald-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: "text-red-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-500",
  },
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
    },
    [remove]
  );

  useEffect(() => {
    globalToast = {
      toast: add,
      success: (msg) => add("success", msg),
      error: (msg) => add("error", msg, 6000),
      warning: (msg) => add("warning", msg, 5000),
      info: (msg) => add("info", msg),
    };
    return () => { globalToast = null; };
  }, [add]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (msg && !msg.includes("hydrat") && !msg.includes("Minified")) {
        add("error", msg, 6000);
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message && !event.message.includes("hydrat") && !event.message.includes("Minified")) {
        add("error", event.message, 6000);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, [add]);

  const ctx: ToastContextValue = {
    toast: add,
    success: (msg) => add("success", msg),
    error: (msg) => add("error", msg, 6000),
    warning: (msg) => add("warning", msg, 5000),
    info: (msg) => add("info", msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 flex flex-col gap-2 pointer-events-none"
        style={{ zIndex: 99999 }}
      >
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${c.bg} ${c.border} max-w-sm w-full animate-in fade-in slide-in-from-right duration-200`}
            >
              <Icon size={18} className={`${c.icon} flex-shrink-0 mt-0.5`} />
              <p className={`text-sm font-medium ${c.text} flex-1`}>{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
                className={`${c.text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
              >
                <FiX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
