import {
  PaymentProvider,
  PaymentSession,
  CreateSessionInput,
  PaymentVerificationResult,
} from "./types";
import {
  createSafePaySession,
  createSafePayPassport,
  buildSafePayCheckoutUrl,
  fetchSafePayPayment,
  safepayCredentialsConfigured,
  SAFTPAY_MODE,
  mapTrackStateToPayment,
} from "@/lib/safepay";

/**
 * Safepay provider adapter. Wraps the existing low-level Safepay client
 * (`lib/safepay.ts`) behind the common `PaymentProvider` interface so checkout
 * code stays provider-agnostic. Safepay is the only provider currently enabled.
 */
export const safepayProvider: PaymentProvider = {
  id: "safepay",

  configured() {
    return safepayCredentialsConfigured();
  },

  unconfiguredReason() {
    return "Safepay credentials are not configured (SAFTPAY_PUBLIC_API / SAFTPAY_Secret_key).";
  },

  async createSession(input: CreateSessionInput): Promise<PaymentSession> {
    const amountPaise = Math.round(input.amount * 100);
    const session = await createSafePaySession({
      amountPaise,
      currency: input.currency || "PKR",
      metadata: { order_id: input.orderNo, ...(input.metadata || {}) },
    });
    const tbt = await createSafePayPassport();
    const redirectUrl = buildSafePayCheckoutUrl({
      tracker: session.tracker,
      tbt,
      redirectUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    return {
      provider: "safepay",
      reference: session.tracker,
      redirectUrl,
      amount: input.amount,
      currency: input.currency || "PKR",
      sandbox: SAFTPAY_MODE !== "production",
    };
  },

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    const payment = await fetchSafePayPayment(reference);
    return {
      provider: "safepay",
      status: mapTrackStateToPayment(payment.state),
      amountPaise: payment.amount,
      currency: payment.currency,
      transactionId: reference,
      method: payment.method,
    };
  },
};
