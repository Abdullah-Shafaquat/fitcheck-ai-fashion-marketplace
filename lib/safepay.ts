import { createHmac, timingSafeEqual } from "crypto";

type SafepayMode = "sandbox" | "production";

const MODE: SafepayMode =
  process.env.SAFTPAY_MODE?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";

const HOST = {
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
}[MODE];

const CHECKOUT_BASE = {
  sandbox: "https://sandbox.api.getsafepay.com/embedded/",
  production: "https://getsafepay.com/embedded/",
}[MODE];

export const SAFTPAY_MODE = MODE;

const clean = (v?: string) => (v || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();
const publicKey = () => clean(process.env.SAFTPAY_PUBLIC_API);
const secretKey = () => clean(process.env.SAFTPAY_Secret_key);

export function safepayCredentialsConfigured(): boolean {
  return Boolean(publicKey() && secretKey());
}

export class SafepayError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "SafepayError";
    this.status = status;
  }
}

interface SafepayResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Safepay's JSON payload shape is dynamic
  data?: any;
  status?: { errors?: { message?: string }[]; message?: string };
}

async function safepayFetch<T = SafepayResponse>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  return safepayFetchWithRetry<T>(path, init, 0);
}

const SAFEPAY_TIMEOUT_MS = 20000;
const SAFEPAY_MAX_RETRIES = 1;

async function safepayFetchWithRetry<T = SafepayResponse>(
  path: string,
  init: { method?: string; body?: unknown } | undefined,
  attempt: number
): Promise<T> {
  if (!safepayCredentialsConfigured()) {
    throw new SafepayError(
      "Safepay credentials are not configured (SAFTPAY_PUBLIC_API / SAFTPAY_Secret_key)."
    );
  }
  const method = init?.method || "GET";
  const body = init?.body === undefined ? undefined : JSON.stringify(init.body);

  let res: Response;
  try {
    res = await fetch(`${HOST}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": secretKey(),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(SAFEPAY_TIMEOUT_MS),
    });
  } catch (error) {
    // Transient network/timeout errors only — retry a bounded number of times.
    if (attempt < SAFEPAY_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500));
      return safepayFetchWithRetry<T>(path, init, attempt + 1);
    }
    console.error(
      `Safepay request to ${path} failed after ${SAFEPAY_MAX_RETRIES + 1} attempt(s):`,
      error instanceof Error ? error.message : "network error"
    );
    throw new SafepayError(
      `Could not reach Safepay (${error instanceof Error ? error.message : "network error"}).`
    );
  }

  const json: SafepayResponse | null = await res.json().catch(() => null);
  if (!res.ok || json?.status?.errors?.length) {
    const message =
      json?.status?.errors?.[0]?.message ||
      json?.status?.message ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic error payload
      (json as any)?.message ||
      `Safepay request failed (${res.status})`;
    throw new SafepayError(message, res.status);
  }
  return json as T;
}

export interface SafePaySessionOptions {
  amountPaise: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export async function createSafePaySession(
  options: SafePaySessionOptions
): Promise<{ tracker: string; state: string; quoteAmount: number }> {
  const json = await safepayFetch("/order/payments/v3/", {
    method: "POST",
    body: {
      merchant_api_key: publicKey(),
      intent: "CYBERSOURCE",
      mode: "payment",
      entry_mode: "raw",
      currency: options.currency || "PKR",
      amount: options.amountPaise,
      metadata: options.metadata || {},
    },
  });

  const tracker = json?.data?.tracker?.token;
  if (!tracker) {
    throw new SafepayError("Safepay did not return a payment session token.");
  }
  return {
    tracker,
    state: json?.data?.tracker?.state || "TRACKER_STARTED",
    quoteAmount: json?.data?.tracker?.purchase_totals?.quote_amount?.amount ?? options.amountPaise,
  };
}

export async function createSafePayPassport(): Promise<string> {
  const json = await safepayFetch("/client/passport/v1/token", {
    method: "POST",
  });
  const data = json?.data;
  if (typeof data === "string") return data;
  if (typeof data?.token === "string") return data.token;
  if (typeof data?.passport === "string") return data.passport;
  throw new SafepayError("Safepay did not return a passport token.");
}

export interface SafePayCheckoutOptions {
  tracker: string;
  tbt: string;
  redirectUrl: string;
  cancelUrl: string;
}

export function buildSafePayCheckoutUrl(options: SafePayCheckoutOptions): string {
  const params = new URLSearchParams();
  params.set("environment", MODE);
  params.set("tracker", options.tracker);
  params.set("tbt", options.tbt);
  params.set("source", "hosted");
  params.set("redirect_url", options.redirectUrl);
  params.set("cancel_url", options.cancelUrl);
  return `${CHECKOUT_BASE}?${params.toString()}`;
}

export type SafePayPaymentState =
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "PENDING";

const STATE_TO_PAYMENT: Record<string, SafePayPaymentState> = {
  TRACKER_ENDED: "PAID",
  TRACKER_STARTED: "PENDING",
  TRACKER_ENROLLED: "PENDING",
  TRACKER_AUTHORIZED: "PENDING",
  TRACKER_DECLINED: "FAILED",
  TRACKER_FAILED: "FAILED",
  TRACKER_CANCELLED: "CANCELLED",
  TRACKER_CANCELLED_BY_MERCHANT: "CANCELLED",
  TRACKER_EXPIRED: "FAILED",
  TRACKER_ERROR: "FAILED",
};

export function mapTrackStateToPayment(state: string): SafePayPaymentState {
  return STATE_TO_PAYMENT[state] || "PENDING";
}

export async function fetchSafePayPayment(
  tracker: string
): Promise<{
  state: string;
  paymentState: SafePayPaymentState;
  amount: number;
  currency: string;
  method?: string;
}> {
  const json = await safepayFetch(`/reporter/api/v1/payments/${encodeURIComponent(tracker)}`);
  const t = json?.data?.tracker || json?.data;
  const state = (t?.state || "TRACKER_STARTED") as string;
  return {
    state,
    paymentState: mapTrackStateToPayment(state),
    amount: t?.purchase_totals?.quote_amount?.amount ?? 0,
    currency: t?.purchase_totals?.quote_amount?.currency || "PKR",
    method: extractPaymentMethod(t),
  };
}

/**
 * Best-effort extraction of the exact payment method used (e.g. "card",
 * "jazzcash", "easypaisa") from a Safepay tracker payload, when Safepay
 * provides it. Returns undefined if Safepay does not return a more specific
 * method so callers can fall back to the neutral provider label ("Safepay").
 * Never hardcodes or fabricates a method.
 */
function extractPaymentMethod(
  tracker: Record<string, unknown> | null | undefined
): string | undefined {
  if (!tracker) return undefined;
  const nested = tracker.payment_method_details;
  const purchase = tracker.purchase_totals;
  const trackerNested = tracker.tracker;
  const candidates: unknown[] = [
    tracker.payment_method,
    typeof nested === "object" && nested !== null
      ? (nested as Record<string, unknown>).type
      : undefined,
    typeof purchase === "object" && purchase !== null
      ? (purchase as Record<string, unknown>).method
      : undefined,
    tracker.method,
    typeof trackerNested === "object" && trackerNested !== null
      ? (trackerNested as Record<string, unknown>).payment_method
      : undefined,
  ];
  for (const c of candidates) {
    const label = typeof c === "string" ? c.trim() : undefined;
    if (label) return label;
  }
  return undefined;
}

export function verifySafePayWebhookSignature(
  payloadJson: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expected = createHmac("sha512", webhookSecret)
    .update(Buffer.from(payloadJson, "utf8"))
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}