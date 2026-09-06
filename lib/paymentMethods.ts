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
  /** Human-readable status shown at checkout. */
  status: "available" | "coming_soon";
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
      status: jazzcashConfigured() ? "available" : "coming_soon",
      note: jazzcashConfigured()
        ? "Enabled. Checkout redirects to JazzCash's hosted page."
        : "Coming soon — enable by setting JazzCash merchant credentials in the environment.",
    },
    {
      id: "easypaisa",
      label: "Easypaisa",
      enabled: easypaisaConfigured(),
      status: easypaisaConfigured() ? "available" : "coming_soon",
      note: easypaisaConfigured()
        ? "Enabled. Checkout redirects to Easypaisa's hosted page."
        : "Coming soon — enable by setting Easypaisa merchant credentials in the environment.",
    },
  ];
}

/** Public metadata for the checkout UI (safe to expose). */
export function getAlternatePaymentInfoPublic() {
  return getAlternatePaymentInfo().map(({ id, label, enabled, status, note }) => ({
    id,
    label,
    enabled,
    status,
    note,
  }));
}
