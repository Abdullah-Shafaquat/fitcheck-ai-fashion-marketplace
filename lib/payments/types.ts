/**
 * Unified payment provider architecture.
 *
 * Every external payment provider (Safepay, JazzCash, ...) implements
 * the `PaymentProvider` interface and is wired up through the factory in
 * `lib/payments/index.ts`. Checkout and order-creation code depend on this
 * interface only — never on provider-specific internals — so a provider can be
 * added, enabled, or disabled without rewriting the checkout flow.
 *
 * The Safepay provider additionally covers the Easypaisa wallet (and bank
 * transfers) on its hosted checkout where the merchant account has them
 * enabled — those are NOT separate providers here; a shopper picks them on
 * Safepay's payment page, and the Safepay tracker reports the method used.
 *
 * The DATABASE is the single source of truth for an order's payment state.
 * These types are a thin internal seam for building provider sessions and
 * verifying/provider callbacks; nothing here is trusted as proof of payment
 * without server-side verification against the authoritative order record.
 */

export type PaymentProviderId = "safepay" | "jazzcash";

export type ProviderPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

/**
 * Internal representation of a provider session handed back to the checkout so
 * it can redirect the customer to the provider's hosted page.
 */
export interface PaymentSession {
  provider: PaymentProviderId;
  /** Provider token / reference for this attempt. Persisted on the order. */
  reference: string;
  /** Absolute URL to send the customer to (hosted checkout). */
  redirectUrl: string;
  /** Amount, in rupees (PKR), that the provider expects. */
  amount: number;
  /** ISO currency code (always PKR here). */
  currency: string;
  /** Whether the provider is live (true) or sandbox/test (false). */
  sandbox: boolean;
}

export interface CreateSessionInput {
  orderId: string;
  orderNo: string;
  /** Authoritative total in rupees — calculated server-side, never client-submitted. */
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  /** Absolute URLs to send the customer back to after the hosted flow. */
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentVerificationResult {
  provider: PaymentProviderId;
  status: ProviderPaymentStatus;
  /** Provider-reported amount in rupeee minor units (paise) when available. */
  amountPaise: number | null;
  currency: string;
  /** Provider transaction id, when available. */
  transactionId: string | null;
  /** Best-effort exact method (e.g. "card" / "jazzcash") if the provider reports it. */
  method?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Whether all required merchant credentials are present in the environment. */
  configured(): boolean;
  /** Human-readable reason when not configured. */
  unconfiguredReason(): string;
  /**
   * Build a hosted payment session. Must re-validate nothing itself — the
   * caller supplies the authoritative server-computed amount.
   */
  createSession(input: CreateSessionInput): Promise<PaymentSession>;
  /**
   * Server-side verification of a payment by its provider reference. Never
   * trusts URL/frontend state.
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
}
