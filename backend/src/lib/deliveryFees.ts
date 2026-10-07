// Pure delivery-fee maths (no database client), shared by the settings
// reader and the checkout bill so quote tests can mock settings alone.

export interface DeliveryFeeTier {
  upToKm: number;
  fee: number;
}

export interface FeeSettings {
  flatDeliveryFee: number;
  deliveryFeeTiers?: DeliveryFeeTier[];
}

// Same defaults as migration 104's column defaults, so a row read before
// that migration lands behaves exactly as the database will after it.
export const DEFAULT_DELIVERY_RADIUS_KM = 12;
export const DEFAULT_ROAD_DISTANCE_FACTOR = 1.4;

export function positive(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Ignores malformed rows rather than failing checkout; sorted ascending so
// the first tier that covers a distance is its price.
export function parseFeeTiers(value: unknown): DeliveryFeeTier[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tier) => ({ upToKm: Number((tier as { up_to_km?: unknown })?.up_to_km), fee: Number((tier as { fee?: unknown })?.fee) }))
    .filter((tier) => Number.isFinite(tier.upToKm) && tier.upToKm > 0 && Number.isFinite(tier.fee) && tier.fee >= 0)
    .sort((a, b) => a.upToKm - b.upToKm);
}

// The delivery fee before free-delivery and extra-shop rules: the first tier
// whose up_to_km covers the road distance; past the last tier, the last
// tier's fee. No tiers, or no known distance, charges the flat fee.
export function distanceDeliveryFee(distanceKm: number | null, settings: FeeSettings): number {
  const tiers = settings.deliveryFeeTiers ?? [];
  if (distanceKm == null || !Number.isFinite(distanceKm) || tiers.length === 0) return settings.flatDeliveryFee;
  return (tiers.find((tier) => distanceKm <= tier.upToKm) ?? tiers[tiers.length - 1]!).fee;
}
