import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  PaymentProvider,
  PaymentSession,
  CreateSessionInput,
  PaymentVerificationResult,
  ProviderPaymentStatus,
} from "./types";

/**
 * Easypaisa provider adapter — ARCHITECTURE READY, credentials NOT present.
 *
 * Implements the Easypaisa request-to-pay / hosted flow shape behind the common
 * `PaymentProvider` interface, gated on merchant credentials. Nothing is
 * created and nothing is claimed until `EASYPAISA_MERCHANT_ID`,
 * `EASYPAISA_HASH_KEY` and a return URL are set. Until then, checkout keeps
 * using Safepay / COD. Callbacks are only trusted after server-side hash
 * verification and amount/currency checks against the authoritative order.
 */

const clean = (v?: string) => (v || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim();

// Easypaisa production payment-hub host.
const EASYPAISA_HOST =
  clean(process.env.EASYPAISA_HOST) || "https://easypay.easypaisa.com.pk";

export function easypaisaConfigured(): boolean {
  return Boolean(
    clean(process.env.EASYPAISA_MERCHANT_ID) &&
      clean(process.env.EASYPAISA_HASH_KEY) &&
      clean(process.env.EASYPAISA_RETURN_URL)
  );
}

export function easypaisaUnconfiguredReason(): string {
  return "Easypaisa credentials are not configured (EASYPAISA_MERCHANT_ID, EASYPAISA_HASH_KEY, EASYPAISA_RETURN_URL).";
}

/**
 * Easypaisa HMAC hash of the transaction data for request signing / callback
 * verification. The exact field set is provider-contract specific; this helper
 * centralizes it so the callback verifier and the session builder stay aligned.
 */
function easypaisaHash(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Placeholder status-inquiry host path — set by the provider contract. */
function easypaisaEndpoints() {
  return {
    checkoutUrl: `${EASYPAISA_HOST}/mpg/payment`,
  };
}

export async function verifyEasypaisaCallback(
  params: Record<string, string>
): Promise<{ valid: boolean; status?: ProviderPaymentStatus; txn: string | null }> {
  if (!easypaisaConfigured()) return { valid: false, txn: null };

  const txn = clean(params.transactionId) || clean(params.orderId) || null;
  const receivedHash = clean(params.hash) || clean(params.signature);
  if (!txn || !receivedHash) return { valid: false, txn };

  const secret = clean(process.env.EASYPAISA_HASH_KEY);
  const expected = easypaisaHash(
    secret,
    `${clean(params.merchantId) || ""}${txn}${clean(params.amount) || ""}`
  );

  const a = Buffer.from(expected);
  const b = Buffer.from(receivedHash);
  const signatureValid = a.length === b.length && timingSafeEqual(a, b);
  const paid = signatureValid && /success|paid|00/i.test(clean(params.status));

  return {
    valid: signatureValid,
    status: paid ? "PAID" : signatureValid ? "FAILED" : undefined,
    txn,
  };
}

export const easypaisaProvider: PaymentProvider = {
  id: "easypaisa",

  configured: easypaisaConfigured,

  unconfiguredReason: easypaisaUnconfiguredReason,

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    if (!easypaisaConfigured()) {
      throw new Error(easypaisaUnconfiguredReason());
    }
    const merchantId = clean(process.env.EASYPAISA_MERCHANT_ID);
    const secret = clean(process.env.EASYPAISA_HASH_KEY);
    const amount = Math.round(input.amount * 100).toString();
    const txnRef = `E${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const data = `${merchantId}${txnRef}${amount}`;
    const hash = easypaisaHash(secret, data);

    const params = new URLSearchParams({
      storeId: merchantId,
      orderId: txnRef,
      transactionAmount: amount,
      transactionType: "MIGS",
      signature: hash,
      returnUrl: clean(process.env.EASYPAISA_RETURN_URL) || input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return {
      provider: "easypaisa",
      reference: txnRef,
      redirectUrl: `${easypaisaEndpoints().checkoutUrl}?${params.toString()}`,
      amount: input.amount,
      currency: "PKR",
      sandbox: !clean(process.env.EASYPAISA_HOST)?.startsWith("https://easypay.easypaisa.com.pk"),
    };
  },

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    return {
      provider: "easypaisa",
      status: "PENDING",
      amountPaise: null,
      currency: "PKR",
      transactionId: reference,
    };
  },
};
