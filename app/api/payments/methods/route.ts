import { NextResponse } from "next/server";
import {
  getPaymentProvider,
  PAYMENT_PROVIDERS,
} from "@/lib/payments";
import { SAFTPAY_MODE } from "@/lib/safepay";

/**
 * Public, safe payment-method status for the checkout UI. Exposes only whether
 * a provider is available and its mode — never credentials.
 */
export async function GET() {
  const providers = PAYMENT_PROVIDERS.map((id) => {
    const provider = getPaymentProvider(id)!;
    const configured = provider.configured();
    return {
      id,
      label: providerLabel(id),
      enabled: configured,
      status: configured ? ("available" as const) : ("coming_soon" as const),
      mode: id === "safepay" ? SAFTPAY_MODE : null,
      note: configured
        ? configuredLabel(id)
        : provider.unconfiguredReason(),
    };
  });

  return NextResponse.json({ providers });
}

function providerLabel(id: string): string {
  switch (id) {
    case "safepay":
      return "Safepay";
    case "jazzcash":
      return "JazzCash";
    case "easypaisa":
      return "Easypaisa";
    default:
      return id;
  }
}

function configuredLabel(id: string): string {
  switch (id) {
    case "safepay":
      return SAFTPAY_MODE === "production"
        ? "Available (production)"
        : "Available (sandbox — test mode)";
    case "jazzcash":
      return "Enabled. Backend processing wired via the provider layer.";
    case "easypaisa":
      return "Enabled. Backend processing wired via the provider layer.";
    default:
      return "Available";
  }
}
