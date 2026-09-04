import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getAuthenticatedCustomer } from "@/lib/customer-auth";
import {
  searchProducts,
  getFeaturedProducts,
  getSaleProducts,
  getProductsByPriceRange,
  getProductsByGender,
  getProductsByCategory,
  getProductBySlug,
  getCustomerOrders,
} from "@/lib/ai-tools";

export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com";

const SYSTEM_PROMPT = `You are FitCheckAI, the premium AI shopping assistant for FitCheck, a Pakistani fashion e-commerce marketplace.

Be warm, concise and fashion-editorial in tone. Help customers discover real products, build outfits, compare items and find what fits their style, budget, occasion and constraints.

HARD RULES:
1. ONLY use products returned by your tools. NEVER invent product names, prices, images, stock, discounts, colors, sizes, reviews or delivery dates.
2. Only state a product is available if the returned data shows stock > 0 and isActive === true. If stock is 0, say it's out of stock and suggest alternatives.
3. Respect explicit constraints: gender, category, size, color and price (Rs). If no products match, say so clearly and offer nearby alternatives.
4. When presenting a product, give its name, price in Rs, a short reason it fits the request, and its product URL (from the "url" field, as a relative link).
5. For outfit requests, combine complementary pieces (top, bottom, shoes, accessory) from real catalog results.
6. Account/order questions ("where is my order", "my recent orders") may only be answered when the user is authenticated. If not authenticated OR order tools are unavailable, explain they need to sign in and point them to the login page. Never guess order data.
7. Never expose passwords, payment details, admin/seller data, other customers' data, or internal secrets. Refuse clearly and safely.
8. If unsure or there is no data, admit it and direct the user to browse the store. Do not fabricate.

When a question is purely conversational ("hello", "thanks"), answer normally without calling tools.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchProducts",
        description:
          "Search the FitCheck catalog by natural-language query and/or filters (category, gender, color, size, minPrice, maxPrice). Use for: 'show me X', 'black sneakers', 'hoodie under 5000', 'wedding outfit ideas'.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING" },
            category: { type: "STRING" },
            gender: { type: "STRING" },
            color: { type: "STRING" },
            size: { type: "STRING" },
            minPrice: { type: "NUMBER" },
            maxPrice: { type: "NUMBER" },
            limit: { type: "NUMBER" },
          },
        },
      },
      {
        name: "getFeaturedProducts",
        description: "Get featured/curated products.",
        parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
      },
      {
        name: "getSaleProducts",
        description: "Get products currently on sale/discount (oldPrice set).",
        parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
      },
      {
        name: "getProductsByPriceRange",
        description: "Get products within a price range in Rs.",
        parameters: {
          type: "OBJECT",
          properties: { minPrice: { type: "NUMBER" }, maxPrice: { type: "NUMBER" }, limit: { type: "NUMBER" } },
        },
      },
      {
        name: "getProductsByGender",
        description: "Get products for a gender (Men, Women, Kids).",
        parameters: { type: "OBJECT", properties: { gender: { type: "STRING" }, limit: { type: "NUMBER" } } },
      },
      {
        name: "getProductsByCategory",
        description: "Get products in a category.",
        parameters: { type: "OBJECT", properties: { category: { type: "STRING" }, limit: { type: "NUMBER" } } },
      },
      {
        name: "getProductBySlug",
        description: "Get a single product by its URL slug.",
        parameters: { type: "OBJECT", properties: { slug: { type: "STRING" } } },
      },
      {
        name: "getCustomerOrders",
        description:
          "Get the currently signed-in customer's recent orders. Only callable when the user is authenticated.",
        parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
      },
    ],
  },
];

interface ToolResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

async function runTool(name: string, args: any, customerEmail: string | null): Promise<ToolResult> {
  try {
    switch (name) {
      case "searchProducts":
        return { ok: true, data: await searchProducts(args) };
      case "getFeaturedProducts":
        return { ok: true, data: await getFeaturedProducts(args) };
      case "getSaleProducts":
        return { ok: true, data: await getSaleProducts(args) };
      case "getProductsByPriceRange":
        return { ok: true, data: await getProductsByPriceRange(args) };
      case "getProductsByGender":
        return { ok: true, data: await getProductsByGender(args) };
      case "getProductsByCategory":
        return { ok: true, data: await getProductsByCategory(args) };
      case "getProductBySlug":
        return { ok: true, data: await getProductBySlug(String(args?.slug || "")) };
      case "getCustomerOrders": {
        if (!customerEmail) {
          return {
            ok: false,
            error: "NOT_AUTHENTICATED",
            data: { requiresAuth: true, message: "You need to sign in to view your orders." },
          };
        }
        return { ok: true, data: await getCustomerOrders(customerEmail, args) };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[AI_TOOL] ${name} failed:`, err);
    return { ok: false, error: "Tool execution failed" };
  }
}

function extractToolCalls(content: any): Array<{ name: string; args: any }> {
  const calls: Array<{ name: string; args: any }> = [];
  const parts = content?.parts;
  if (!Array.isArray(parts)) return calls;
  for (const part of parts) {
    for (const fc of part?.functionCall ?? []) {
      if (fc?.name) calls.push({ name: fc.name, args: fc.args || {} });
    }
  }
  return calls;
}

function extractText(content: any): string {
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function collectProducts(...results: ToolResult[]): any[] {
  const products: any[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!r?.ok || !Array.isArray(r.data)) continue;
    for (const row of r.data as any[]) {
      if (row?.slug && !seen.has(row.slug)) {
        seen.add(row.slug);
        products.push(row);
      }
    }
  }
  return products.slice(0, 12);
}

function passThroughCall(name: string, args: any) {
  return { functionCall: { name, args } };
}
function functionResponses(results: ToolResult[], names: string[]) {
  return results.map((r, i) => ({
    functionResponse: { name: names[i], response: { result: r } },
  }));
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { windowMs: 60_000, max: 30, label: "ai-assistant" });
  if (limited) return limited;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "AI assistant is temporarily unavailable.",
        reply:
          "The style assistant isn't configured on this store yet, but you can still browse everything normally. Would you like to start with best sellers?",
        products: [],
      },
      { status: 200 }
    );
  }

  let customerEmail: string | null = null;
  try {
    const auth = getAuthenticatedCustomer(req);
    if (auth?.email) customerEmail = auth.email.toLowerCase();
  } catch {
    customerEmail = null;
  }

  let body: { message?: string; history?: any[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const userMessage = (body?.message || "").toString().trim().slice(0, 1000);
  if (!userMessage) {
    return NextResponse.json({ error: "Please enter a message.", reply: "How can I help?", products: [] }, { status: 200 });
  }

  // Build a single conversation array that accumulates model/user turns with
  // tool calls + function responses so Gemini can chain tools within one turn.
  const conversation: any[] = [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }];
  const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
  for (const m of history) {
    conversation.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : "" }],
    });
  }
  conversation.push({ role: "user", parts: [{ text: userMessage }] });

  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let products: any[] = [];
  let text = "";
  let guard = 0;

  while (guard < 4) {
    guard += 1;
    let data: any;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: conversation,
          tools: TOOLS,
          toolConfig: { functionCallingConfig: { mode: "AUTO" } },
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      });
      data = await res.json();
    } catch (err) {
      console.error("[AI_GEMINI] Network error:", err);
      return NextResponse.json(
        { error: "AI assistant is temporarily unavailable.", reply: "I couldn't reach the assistant just now. You can still browse the store normally.", products: [] },
        { status: 200 }
      );
    }

    if (!res.ok) {
      const errMsg = data?.error?.status || data?.error?.message || "";
      console.error(`[AI_GEMINI] HTTP ${res.status}: ${errMsg}`);
      if (res.status === 429 || /quota|rate|limit/i.test(errMsg)) {
        return NextResponse.json(
          { error: "Assistant is busy right now.", reply: "Our assistant is getting a lot of requests. Please try again in a moment — the store remains fully available.", products: [] },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: "AI assistant is temporarily unavailable.", reply: "The style assistant couldn't connect. You can keep browsing the store normally.", products: [] },
        { status: 200 }
      );
    }

    const content = data?.candidates?.[0]?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI assistant is temporarily unavailable.", reply: "I couldn't find an answer. Please try rephrasing.", products: [] },
        { status: 200 }
      );
    }

    const calls = extractToolCalls(content);
    if (calls.length === 0) {
      text = extractText(content);
      break;
    }

    // Execute the tool calls and record their results for product cards.
    const results: ToolResult[] = [];
    for (const call of calls) {
      const r = await runTool(call.name, call.args, customerEmail);
      results.push(r);
      const p = collectProducts(r);
      products = products.concat(p);
    }
    products = dedupeProducts(products);

    // Append the model's function calls + our function responses, then loop.
    conversation.push({ role: "model", parts: calls.map((c) => passThroughCall(c.name, c.args)) });
    conversation.push({ role: "user", parts: functionResponses(results, calls.map((c) => c.name)) });
  }

  if (products.length > 0) products = dedupeProducts(products).slice(0, 12);
  if (!text) {
    text =
      "Here's what I found in the FitCheck catalog. You can tap a product to see it, or ask me to narrow things down by style, size or budget.";
  }

  return NextResponse.json({ reply: text, products, error: null }, { status: 200 });
}

function dedupeProducts(products: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const p of products) {
    if (p?.slug && !seen.has(p.slug)) {
      seen.add(p.slug);
      out.push(p);
    }
  }
  return out;
}
