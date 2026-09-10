/**
 * Config-gated alternate payment providers (JazzCash / Easypaisa).
 *
 * A provider becomes selectable at checkout once its merchant credentials are
 * present in the environment. When configured, orders are created through the
 * unified provider layer and the customer is redirected to the provider's
 * hosted checkout; payments are confirmed server-side via the provider's IPN
 * webhook (signature + amount verified against the authoritative order).
 */

import { getPaymentProvider } from "@/lib/payments";

export type AlternatePaymentProvider = "jazzcash" | "easypaisa";

export interface AlternatePaymentProviderInfo {
  id: AlternatePaymentProvider;
  label: string;
  /** Whether merchant credentials are configured in the environment. */
  enabled: boolean;
  /** Human-readable note (server metadata / admin diagnostics). */
  note: string;
}

export function jazzcashConfigured(): boolean {
  return getPaymentProvider("jazzcash")?.configured() ?? false;
}

export function easypaisaConfigured(): boolean {
  return getPaymentProvider("easypaisa")?.configured() ?? false;
}

export function getAlternatePaymentInfo(): AlternatePaymentProviderInfo[] {
  return [
    {
      id: "jazzcash",
      label: "JazzCash",
      enabled: jazzcashConfigured(),
      note: jazzcashConfigured()
        ? "Payment is processed on JazzCash's secure hosted page."
        : "JazzCash credentials are not configured (NEXT_PUBLIC_JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_SALT_KEY).",
    },
    {
      id: "easypaisa",
      label: "Easypaisa",
      enabled: easypaisaConfigured(),
      note: easypaisaConfigured()
        ? "Payment is processed on Easypaisa's secure hosted page."
        : "Easypaisa credentials are not configured (NEXT_PUBLIC_EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY).",
    },
  ];
}

/** Public metadata for the checkout UI (safe to expose). */
export function getAlternatePaymentInfoPublic() {
  return getAlternatePaymentInfo().map(({ id, label, enabled, note }) => ({
    id,
    label,
    enabled,
    note,
  }));
}
