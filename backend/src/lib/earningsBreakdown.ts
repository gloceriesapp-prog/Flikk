import { DEFAULT_EXTRA_STOP_FEE, nonNegative } from './deliveryFees.js';
import { round2 } from './pricing.js';

// The rider pay settings on delivery_settings (migrations 104 and 108).
export interface RiderPaySettings {
  riderBasePayout: number;
  riderExtraStopPayout: number;
  extraStopFee?: number;
}

export interface RiderPayout { amount: number; base: number; extraStop: number }

// Mirror of rider_delivery_payout (migration 20261027090000), the rule the
// database applies when it writes rider_earnings. Used to show a rider what a
// delivery will pay before it completes.
// - riderBasePayout > 0: exactly riderBasePayout per order or trip (the rest
//   of the delivery fee stays with the platform), plus riderExtraStopPayout
//   for each extra shop, or the customer's extra-shop fee when that is 0.
// - riderBasePayout = 0: exactly the delivery fee charged; the extra-shop
//   part of that fee is reported as the extra-stop share.
export function riderDeliveryPayout(deliveryFee: number, extraStops: number, settings: RiderPaySettings): RiderPayout {
  const fee = Math.max(0, Number(deliveryFee) || 0);
  const stops = Math.max(0, Math.floor(Number(extraStops) || 0));
  const basePayout = Math.max(0, Number(settings.riderBasePayout) || 0);
  const stopFee = nonNegative(settings.extraStopFee, DEFAULT_EXTRA_STOP_FEE);
  let base: number;
  let extraStop: number;
  const stopPayout = Math.max(0, Number(settings.riderExtraStopPayout) || 0);
  if (basePayout > 0) {
    base = round2(basePayout);
    extraStop = round2(stopPayout > 0 ? stopPayout * stops : Math.min(fee, stopFee * stops));
  } else {
    extraStop = round2(Math.min(fee, stopFee * stops));
    base = round2(fee - extraStop);
  }
  return { amount: round2(base + extraStop), base, extraStop };
}

// Extra shops the rider visits: distinct shops on legs that were not
// cancelled, minus the first. A single-store order has none.
export function extraStopCount(legs: { store_id: string | null; status: string }[]): number {
  const shops = new Set(legs.filter((leg) => leg.status !== 'cancelled').map((leg) => leg.store_id));
  return Math.max(0, shops.size - 1);
}
