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

export interface DeliverySettings {
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
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
  };
}

// itemTotal here must be the SAME real item total the order/trip is
// actually charging for (calcItemTotal's own real line totals) — never an
// unvalidated client-sent figure.
export function calcDeliveryFee(itemTotal: number, settings: DeliverySettings): number {
  if (settings.freeDeliveryEnabled && itemTotal >= settings.freeDeliveryThreshold) return 0;
  return settings.flatDeliveryFee;
}
