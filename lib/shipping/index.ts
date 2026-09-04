import { ShipmentCreateInput, ShipmentCreated, ShippingProvider } from "./types";

/**
 * No real carrier credentials are configured, so the registry is empty. Adding
 * a live carrier later (TCS, Leopards, Trax, ...) means implementing
 * `ShippingProvider` and registering it here. Checkout/order code resolves the
 * provider through this factory and never assumes one is available.
 */

const REGISTRY: Record<string, ShippingProvider> = {};

export function getShippingProvider(id: string): ShippingProvider | null {
  return REGISTRY[id] ?? null;
}

export function listShippingProviders(): Array<{
  id: string;
  label: string;
  configured: boolean;
}> {
  return Object.entries(REGISTRY).map(([id, p]) => ({
    id,
    label: p.label,
    configured: p.configured(),
  }));
}

/**
 * Orchestrates shipment booking for an order line.
 *
 * - If a live carrier is registered AND configured, calls its API and returns
 *   the real tracking result.
 * - Otherwise returns the MANUAL fallback: `booked:false` with a human note.
 *   We never fabricate a tracking number or pretend a shipment was created, so
 *   order code can safely surface "tracking number will be added by the
 *   merchant after hand-off" until a real carrier is wired in.
 */
export async function bookShipment(
  providerId: string,
  input: ShipmentCreateInput
): Promise<ShipmentCreated> {
  const provider = REGISTRY[providerId];
  if (provider && provider.configured()) {
    try {
      return await provider.createShipment(input);
    } catch (error) {
      console.error(`[SHIPPING] Carrier '${providerId}' createShipment failed`, error);
      return {
        trackingNumber: null,
        carrier: provider.label,
        booked: false,
        note: "Carrier booking failed; tracking number will be entered manually.",
      };
    }
  }

  const unblocked = provider ? `carrier '${provider.label}' not configured` : "no carrier registered";
  return {
    trackingNumber: null,
    carrier: provider ? provider.label : "Manual",
    booked: false,
    note: `Manual fulfillment (${unblocked}). Tracking number is added by the merchant after hand-off.`,
  };
}
