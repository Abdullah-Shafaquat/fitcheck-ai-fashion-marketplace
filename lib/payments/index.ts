import { PaymentProvider, PaymentProviderId } from "./types";
import { safepayProvider } from "./safepay-provider";
import { jazzcashProvider } from "./jazzcash-provider";

/**
 * Provider registry. Checkout/order code resolves a provider by id through this
 * factory so it never imports provider internals directly.
 *
 * Easypaisa is intentionally NOT registered: Safepay processes the Easypaisa
 * wallet on its own hosted checkout, so shoppers select Easypaisa on Safepay's
 * page and no separate Easypaisa integration or credentials exist.
 */
const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  safepay: safepayProvider,
  jazzcash: jazzcashProvider,
};

export const PAYMENT_PROVIDERS: PaymentProviderId[] = ["safepay", "jazzcash"];

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
