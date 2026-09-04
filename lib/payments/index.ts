import { PaymentProvider, PaymentProviderId } from "./types";
import { safepayProvider } from "./safepay-provider";
import { jazzcashProvider } from "./jazzcash-provider";
import { easypaisaProvider } from "./easypaisa-provider";

/**
 * Provider registry. Checkout/order code resolves a provider by id through this
 * factory so it never imports provider internals directly.
 */
const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  safepay: safepayProvider,
  jazzcash: jazzcashProvider,
  easypaisa: easypaisaProvider,
};

export const PAYMENT_PROVIDERS: PaymentProviderId[] = [
  "safepay",
  "jazzcash",
  "easypaisa",
];

export function getPaymentProvider(id: string): PaymentProvider | null {
  if (id in REGISTRY) return REGISTRY[id as PaymentProviderId];
  return null;
}

export function isPaymentProviderConfigured(id: string): boolean {
  const provider = getPaymentProvider(id);
  return provider ? provider.configured() : false;
}

export { SAFTPAY_MODE } from "@/lib/safepay";

export type { PaymentProvider, PaymentProviderId } from "./types";
