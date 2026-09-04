/**
 * Shipping integration architecture.
 *
 * FitCheck stores the authoritative shipping/fulfillment state on the `Order`
 * (status timeline, `trackingNumber`, expected delivery range) and the per-line
 * `ownerSellerId` in `Order.items`. This module adds a clean, provider-agnostic
 * seam for future carrier integrations (TCS, Leopards, etc.) WITHOUT inventing
 * providers or faking shipment creation.
 *
 * No real carrier credentials exist, so no provider is registered as live. The
 * adapters below define the contract and normalize tracking events; wiring a
 * real carrier later means adding a `ShippingProvider` entry and pointing the
 * factory at it — no checkout rewrite.
 */

export type ShippingMethodId = "standard" | "express";

export interface ShippingMethod {
  id: ShippingMethodId;
  label: string;
  description: string;
  /** Server-computed flat/distance cost in PKR. */
  cost: number;
  /** Business-day range, used only when no carrier estimate exists. */
  estimateDays: { min: number; max: number };
  /** Free-shipping threshold (subtotal >= threshold => cost 0). */
  freeOver: number;
}

export interface ShipmentCreateInput {
  orderId: string;
  orderNo: string;
  /** Full recipient address snapshot for the label. */
  address: {
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    province?: string;
    country: string;
  };
  /** Parcel metadata derived from the order lines. */
  items: Array<{ name: string; quantity: number }>;
  method: ShippingMethodId;
}

export interface ShipmentCreated {
  /** Courier tracking number (only present when a real API call succeeded). */
  trackingNumber: string | null;
  carrier: string;
  /** False until a real provider creates a shipment. */
  booked: boolean;
  /** Human-readable reason when `booked` is false. */
  note?: string;
}

export type NormalizedTrackingEvent =
  | "LABEL_CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_EXCEPTION"
  | "RETURNED";

export interface TrackingUpdate {
  event: NormalizedTrackingEvent;
  /** ISO timestamp of the event (from the carrier when available). */
  occurredAt: string;
  /** Optional carrier location / detail. */
  location?: string;
  note?: string;
}

export interface ShippingProvider {
  readonly id: string;
  readonly label: string;
  /** Whether live credentials are configured. */
  configured(): boolean;
  /** Create a real shipment via the carrier API; throws if not configured. */
  createShipment(input: ShipmentCreateInput): Promise<ShipmentCreated>;
  /**
   * Query the carrier for latest tracking events for a tracking number.
   * Throws / returns empty when the carrier API is unavailable.
   */
  fetchTracking(trackingNumber: string): Promise<TrackingUpdate[]>;
}

/** Which order-fulfillment statuses a normalized tracking event may produce. */
export function trackingEventToOrderPhase(
  event: NormalizedTrackingEvent
): "Shipped" | "Out for Delivery" | "Delivered" | null {
  switch (event) {
    case "PICKED_UP":
    case "IN_TRANSIT":
    case "LABEL_CREATED":
      return "Shipped";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    case "DELIVERY_EXCEPTION":
    case "RETURNED":
      return null;
  }
}
