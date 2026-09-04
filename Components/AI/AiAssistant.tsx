"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import {
  FiX,
  FiSend,
  FiTrash2,
  FiLoader,
  FiShoppingBag,
  FiZap,
  FiAlertCircle,
} from "react-icons/fi";

interface ProductCard {
  name: string;
  slug: string;
  price: number;
  image: string;
  colors: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
  error?: boolean;
}

const QUICK_PROMPTS = [
  "Find me something under Rs 5000",
  "Build an outfit for me",
  "Show new arrivals",
  "Find black sneakers",
  "Track my order",
];

function ChatPanel({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fitcheck-user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setUserName(u.name);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!greetedRef.current && messages.length === 0) {
      greetedRef.current = true;
      const greeting = userName
        ? `Welcome back, ${userName.split(" ")[0]}! I'm FitCheck, your personal style assistant. Ask me to find products, build an outfit, or check your recent orders.`
        : "Hi! I'm FitCheck, your style assistant. Ask me to find products, build an outfit, or check your recent orders.";
      setMessages([{ id: "welcome", role: "assistant", content: greeting }]);
    }
  }, [messages.length, userName]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, loading, reduceMotion]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setError(null);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const history = messages
        .filter((m) => m.role === "assistant" && m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("request failed");
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || "I couldn't find an answer. Please try again.",
        products: Array.isArray(data.products) ? data.products : [],
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch {
      setError("Connection problem — please try again.");
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I hit a small snag reaching the assistant. Please try again in a moment.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ id: "welcome", role: "assistant", content: "Chat cleared. What shall we find today?" }]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 bg-[#111111] text-white flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
          <FiZap size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">FitCheck Assistant</p>
          <p className="text-[10px] text-white/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            AI style &amp; shopping help
          </p>
        </div>
        <button
          onClick={clearChat}
          aria-label="Clear chat"
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <FiTrash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-[#FF6B35] text-white rounded-br-md"
                  : "bg-white border border-gray-100 rounded-bl-md text-[#1F1F1F] shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.products && m.products.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.products.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/products/${p.slug}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 p-2 hover:border-[#FF6B35]/40 hover:shadow-sm transition-all bg-white"
                    >
                      <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.image ? (
                          <Image src={p.image} alt={p.name} fill sizes="48px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1F1F1F] truncate">{p.name}</p>
                        <p className="text-sm font-bold text-[#FF6B35]">
                          Rs {typeof p.price === "number" ? p.price.toLocaleString() : "—"}
                        </p>
                      </div>
                      <FiShoppingBag size={16} className="text-gray-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <FiAlertCircle size={14} />
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className={`px-4 pb-2 flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-[11px] font-medium text-[#FF6B35] bg-[#FF6B35]/5 hover:bg-[#FF6B35]/10 border border-[#FF6B35]/20 rounded-full px-3 py-1.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-3 border-t border-gray-100 flex items-center gap-2 bg-white flex-shrink-0"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a product, outfit or order..."
          aria-label="Message the assistant"
          className="flex-1 text-sm px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/15 focus:border-[#FF6B35]/40 text-[#1F1F1F] placeholder:text-gray-300"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="w-11 h-11 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center hover:bg-[#e05a2b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? <FiLoader size={18} className="animate-spin" /> : <FiSend size={18} />}
        </button>
      </form>
    </div>
  );
}

export default function AiAssistant({ variant = "float" }: { variant?: "float" | "page" }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (variant === "page") {
    return (
      <section className="w-full bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
          <div className="mb-6">
            <p className="eyebrow-light mb-2">AI Style &amp; Shopping Assistant</p>
            <h1 className="editorial-title text-3xl sm:text-4xl md:text-[2.75rem] text-[#1F1F1F]">
              FitCheck Assistant
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-xl">
              Ask me to find products, build an outfit, compare items, respect your budget, or check
              your recent orders — all from the real FitCheck catalog.
            </p>
          </div>
          <div className="h-[70vh] min-h-[480px] bg-white rounded-3xl border border-gray-100 shadow-[var(--shadow-card)] overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI style assistant"
          className="fixed bottom-5 right-5 z-[70] w-14 h-14 rounded-full bg-[#FF6B35] text-white shadow-xl shadow-[#FF6B35]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300"
          style={{ animation: reduceMotion ? "none" : "assistantPulse 3s ease-in-out infinite" }}
        >
          <FiZap size={22} />
        </button>
      )}

      {open && (
        <div role="dialog" aria-label="FitCheck AI style assistant" className="fixed inset-0 z-[80] flex items-stretch justify-end sm:items-end sm:justify-end sm:p-5">
          <div className="absolute inset-0 bg-black/30 sm:bg-transparent" onClick={() => setOpen(false)} />
          <div className="relative z-10 mx-auto sm:mx-0 w-full sm:w-[400px] h-[85vh] sm:h-[600px] max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-end px-3 py-2 bg-[#111111] flex-shrink-0">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ChatPanel compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
