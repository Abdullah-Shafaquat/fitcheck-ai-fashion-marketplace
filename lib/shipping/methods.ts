import { ShippingMethod, ShippingMethodId } from "./types";
import { getAdminSettings } from "@/lib/adminSettings";

/**
 * Server-authoritative shipping methods and costs. The checkout NEVER trusts a
 * client-supplied shipping price: it looks these up server-side.
 *
 * Thresholds are read from the persisted admin settings (single source of
 * truth). When a value is unset/absent, the previous environment-variable
 * override is honoured, otherwise the historical default is used.
 */

interface ShippingConfig {
  freeShippingThreshold: number;
  standardShipping: number;
  expressShipping: number;
}

/** Historic defaults when no admin setting or env override is present. */
const DEFAULT_CONFIG: ShippingConfig = {
  freeShippingThreshold: 5000,
  standardShipping: 250,
  expressShipping: 500,
};

/**
 * Load the effective shipping configuration, preferring persisted admin
 * settings, then environment overrides, then defaults. Because the module is
 * async, callers (order creation, shipping methods route) await it server-side.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  const defaults: ShippingConfig = {
    freeShippingThreshold:
      Number(process.env.FREE_SHIPPING_THRESHOLD) || DEFAULT_CONFIG.freeShippingThreshold,
    standardShipping:
      Number(process.env.STANDARD_SHIPPING_FEE) || DEFAULT_CONFIG.standardShipping,
    expressShipping:
      Number(process.env.EXPRESS_SHIPPING_FEE) || DEFAULT_CONFIG.expressShipping,
  };

  try {
    const admin = await getAdminSettings();
    return {
      freeShippingThreshold:
        admin.freeShippingThreshold || defaults.freeShippingThreshold,
      standardShipping: admin.standardShipping || defaults.standardShipping,
      expressShipping: admin.expressShipping || defaults.expressShipping,
    };
  } catch (error) {
    console.error("Failed to load admin shipping settings; using fallback:", error);
    return defaults;
  }
}

function costOrFree(
  subtotal: number,
  base: number,
  method: Pick<ShippingMethod, "id" | "freeOver">
): number {
  if (subtotal >= method.freeOver) return 0;
  if (method.id === "express") {
    return base;
  }
  return base;
}

function buildMethods(
  cfg: ShippingConfig,
  subtotal: number
): ShippingMethod[] {
  const methods: Array<
    Omit<ShippingMethod, "cost"> & { cost: number }
  > = [
    {
      id: "standard",
      label: "Standard Delivery",
      description: "Parcel delivery within 4–6 business days.",
      cost: costOrFree(subtotal, cfg.standardShipping, {
        id: "standard",
        freeOver: cfg.freeShippingThreshold,
      }),
      estimateDays: { min: 4, max: 6 },
      freeOver: cfg.freeShippingThreshold,
    },
    {
      id: "express",
      label: "Express Delivery",
      description: "Faster delivery within 2–3 business days.",
      cost: costOrFree(subtotal, cfg.expressShipping, {
        id: "express",
        freeOver: cfg.freeShippingThreshold,
      }),
      estimateDays: { min: 2, max: 3 },
      freeOver: cfg.freeShippingThreshold,
    },
  ];
  return methods;
}

export async function getShippingMethods(subtotal: number): Promise<ShippingMethod[]> {
  const cfg = await getShippingConfig();
  return buildMethods(cfg, subtotal);
}

export async function getShippingMethod(
  id: ShippingMethodId | string,
  subtotal: number
): Promise<ShippingMethod | null> {
  if (id !== "standard" && id !== "express") return null;
  return (await getShippingMethods(subtotal)).find((m) => m.id === id) ?? null;
}

export async function computeShippingCost(
  methodId: string,
  subtotal: number
): Promise<{ ok: true; cost: number; method: ShippingMethod } | { ok: false; error: string }> {
  const method = await getShippingMethod(methodId, subtotal);
  if (!method) return { ok: false, error: "Unsupported shipping method." };
  return { ok: true, cost: method.cost, method };
}

/**
 * Public, synchronous, env/default free-shipping threshold for display-only.
 * The authoritative cost decision happens in computeShippingCost (server-side).
 */
export const FREE_SHIPPING_THRESHOLD_PUBLIC =
  Number(process.env.FREE_SHIPPING_THRESHOLD) || DEFAULT_CONFIG.freeShippingThreshold;
