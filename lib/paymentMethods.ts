/**
 * Config-gated alternate payment providers (JazzCash / Easypaisa).
 *
 * These are SCAFFOLDING ONLY. They are NOT live integrations. A provider only
 * becomes selectable at checkout once its merchant credentials are present in
 * the environment. Even when configured, orders are NOT automatically
 * processed through the provider until the corresponding backend integration
 * is implemented (see `app/api/orders` and the note in each method below).
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
        ? "Enabled. Backend processing requires the JazzCash integration to be wired up."
        : "Coming soon — enable by setting JazzCash merchant credentials in the environment.",
    },
    {
      id: "easypaisa",
      label: "Easypaisa",
      enabled: easypaisaConfigured(),
      status: easypaisaConfigured() ? "available" : "coming_soon",
      note: easypaisaConfigured()
        ? "Enabled. Backend processing requires the Easypaisa integration to be wired up."
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
