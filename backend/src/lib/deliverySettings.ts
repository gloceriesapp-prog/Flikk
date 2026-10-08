// Server-authoritative delivery + handling fees — the single
// delivery_settings row (migrations/029/030), same one apps/admin's
// Settings page edits and GET /delivery-settings (routes/
// deliverySettings.ts) serves to the customer app for display. Fetched
// fresh per order/trip creation (a settings change should take effect on
// the very next order, not after some cache TTL) rather than trusting any
// fee the client sends — same "never trust the client for money" rule
// routes/orders.ts and routes/trips.ts already follow for everything else
// (item prices, promo discounts).

import { supabase } from '../db/supabase.js';
import { DEFAULT_DELIVERY_RADIUS_KM, DEFAULT_EXTRA_STOP_FEE, DEFAULT_ROAD_DISTANCE_FACTOR, distanceDeliveryFee, nonNegative, parseFeeTiers, positive, type DeliveryFeeTier } from './deliveryFees.js';
import type { RiderPaySettings } from './earningsBreakdown.js';
import { parseOrderingHours } from './orderingHours.js';

export function orderingHoursFields(opens: unknown, closes: unknown) {
  const hours = parseOrderingHours(opens, closes);
  return { orderingOpensMinute: hours.opensMinute, orderingClosesMinute: hours.closesMinute };
}

export { distanceDeliveryFee, parseFeeTiers, type DeliveryFeeTier };

export interface DeliverySettings {
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
  estimatedDeliveryMinutes: number;
  // migration 104 — reach and distance pricing (see that file's header).
  defaultDeliveryRadiusKm: number;
  roadDistanceFactor: number;
  deliveryFeeTiers: DeliveryFeeTier[];
  maxStoreSpreadKm: number;
  // migration 108 — what the customer pays per shop after the first.
  extraStopFee: number;
  // migration 112 — platform ordering window, IST minutes since midnight.
  orderingOpensMinute: number;
  orderingClosesMinute: number;
  // migration 109 — minutes a store has to accept a new order before
  // jobs/storeNoResponse.ts cancels it (the partner app's timer uses it too).
  storeResponseTimeoutMinutes: number;
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const { data, error } = await supabase.from('delivery_settings').select('*').limit(1).single();
  if (error) throw error;
  // Number(...) — PostgREST serializes Postgres `numeric` columns as JSON
  // strings (precision safety), not JSON numbers. Left uncoerced, every
  // money calc downstream (calcDeliveryFee, calcOrderTotal) would silently
  // string-concatenate instead of add the moment this touches a real
  // number (e.g. `450 + "25"` -> `"45025"`, not `475`) — this is the one
  // real defense against that for every order/trip this feeds.
  return {
    flatDeliveryFee: Number(data.flat_delivery_fee),
    freeDeliveryEnabled: data.free_delivery_enabled,
    freeDeliveryThreshold: Number(data.free_delivery_threshold),
    handlingFee: Number(data.handling_fee),
    estimatedDeliveryMinutes: Number(data.estimated_delivery_minutes ?? 35),
    defaultDeliveryRadiusKm: positive(data.default_delivery_radius_km, DEFAULT_DELIVERY_RADIUS_KM),
    roadDistanceFactor: Math.max(1, positive(data.road_distance_factor, DEFAULT_ROAD_DISTANCE_FACTOR)),
    deliveryFeeTiers: parseFeeTiers(data.delivery_fee_tiers),
    maxStoreSpreadKm: Math.max(0, Number(data.max_store_spread_km ?? 0) || 0),
    extraStopFee: nonNegative(data.extra_stop_fee, DEFAULT_EXTRA_STOP_FEE),
    ...orderingHoursFields(data.ordering_opens_minute, data.ordering_closes_minute),
    storeResponseTimeoutMinutes: Number(data.store_response_timeout_minutes ?? 10) || 10,
  };
}

// Rider pay settings (migrations 104 and 108). Kept out of DeliverySettings,
// which GET /delivery-settings serves to customers as-is.
export async function getRiderPaySettings(): Promise<Required<RiderPaySettings>> {
  const { data, error } = await supabase.from('delivery_settings')
    .select('rider_base_payout, rider_extra_stop_payout, extra_stop_fee').limit(1).single();
  if (error) throw error;
  return {
    riderBasePayout: nonNegative(data.rider_base_payout, 0),
    riderExtraStopPayout: nonNegative(data.rider_extra_stop_payout, 0),
    extraStopFee: nonNegative(data.extra_stop_fee, DEFAULT_EXTRA_STOP_FEE),
  };
}

// itemTotal here must be the SAME real item total the order/trip is
// actually charging for (calcItemTotal's own real line totals) — never an
// unvalidated client-sent figure.
export function calcDeliveryFee(itemTotal: number, settings: DeliverySettings, distanceKm: number | null = null): number {
  if (settings.freeDeliveryEnabled && itemTotal >= settings.freeDeliveryThreshold) return 0;
  return distanceDeliveryFee(distanceKm, settings);
}
