/**
 * Alternate payment providers.
 *
 * JazzCash is a direct hosted checkout, config-gated on its own merchant
 * credentials (JAZZCASH_*). Easypaisa is NOT integrated separately — Safepay
 * processes the Easypaisa wallet on its hosted checkout, so shoppers select
 * Easypaisa on Safepay's payment page and no Easypaisa credentials are needed.
 */

import { getPaymentProvider } from "@/lib/payments";

export type AlternatePaymentProvider = "jazzcash";

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
