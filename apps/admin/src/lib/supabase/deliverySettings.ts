// Maps between the real public.delivery_settings row (a guaranteed
// singleton — migrations/029/030) and this dashboard's DeliverySettings
// type. Covered by the public delivery_settings_read_all RLS policy, same
// rationale as lib/supabase/homeTabs.ts's own note. Writes live in
// app/api/delivery-settings/route.ts instead (service_role, since there's
// no owner_user_id here for a normal RLS write policy to check against —
// this is a single zone-wide config, not a per-owner row).

import { supabase } from './client';

export interface DeliverySettingsRow {
  id: string;
  flat_delivery_fee: number;
  free_delivery_enabled: boolean;
  free_delivery_threshold: number;
  handling_fee: number;
  estimated_delivery_minutes?: number;
  // migration 104 — what a rider is paid per delivery / per extra trip stop.
  // Applied by rider_delivery_payout (migration 108) when an earning is written.
  rider_base_payout?: number | string | null;
  rider_extra_stop_payout?: number | string | null;
  // migration 108 — customer fee per store after the first.
  extra_stop_fee?: number | string | null;
  // migration 104 — delivery reach and distance pricing.
  default_delivery_radius_km?: number | string | null;
  road_distance_factor?: number | string | null;
  delivery_fee_tiers?: unknown;
  max_store_spread_km?: number | string | null;
  // migration 112 — platform ordering window, IST minutes since midnight.
  ordering_opens_minute?: number | null;
  ordering_closes_minute?: number | null;
  // migration 109 — minutes a store has to accept an order before the
  // backend's store_no_response job cancels it.
  store_response_timeout_minutes?: number | null;
}

export interface DeliveryFeeTier {
  upToKm: number;
  fee: number;
}

export interface DeliverySettings {
  id: string;
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
  estimatedDeliveryMinutes: number;
  riderBasePayout: number;
  riderExtraStopPayout: number;
  extraStopFee: number;
  defaultDeliveryRadiusKm: number;
  roadDistanceFactor: number;
  deliveryFeeTiers: DeliveryFeeTier[];
  maxStoreSpreadKm: number;
  orderingOpensMinute: number;
  orderingClosesMinute: number;
  storeResponseTimeoutMinutes: number;
}

// <input type="time"> values <-> IST minutes since midnight. A closing time
// of 00:00 means midnight at the end of the day (1440).
export function minuteToTimeInput(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function timeInputToMinute(value: string, endOfDay = false): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const total = hour * 60 + minute;
  return endOfDay && total === 0 ? 1440 : total;
}

// Same parsing as backend/src/lib/deliveryFees.ts: malformed rows dropped,
// sorted by distance.
export function parseFeeTiers(value: unknown): DeliveryFeeTier[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tier) => ({ upToKm: Number((tier as { up_to_km?: unknown })?.up_to_km), fee: Number((tier as { fee?: unknown })?.fee) }))
    .filter((tier) => Number.isFinite(tier.upToKm) && tier.upToKm > 0 && Number.isFinite(tier.fee) && tier.fee >= 0)
    .sort((a, b) => a.upToKm - b.upToKm);
}

export const DELIVERY_SETTINGS_SELECT = '*';

export function mapRowToDeliverySettings(row: DeliverySettingsRow): DeliverySettings {
  // Number(...) — PostgREST serializes Postgres `numeric` columns as JSON
  // strings, not JSON numbers; left uncoerced, the settings page's own
  // dirty-check (Number(draft.x) !== saved.x) and its input defaults would
  // silently compare/display a string. Same defensive coercion
  // backend/src/lib/deliverySettings.ts applies for the money-math side.
  return {
    id: row.id,
    flatDeliveryFee: Number(row.flat_delivery_fee),
    freeDeliveryEnabled: row.free_delivery_enabled,
    freeDeliveryThreshold: Number(row.free_delivery_threshold),
    handlingFee: Number(row.handling_fee),
    estimatedDeliveryMinutes: Number(row.estimated_delivery_minutes ?? 35),
    riderBasePayout: Number(row.rider_base_payout ?? 0),
    riderExtraStopPayout: Number(row.rider_extra_stop_payout ?? 0),
    extraStopFee: Number(row.extra_stop_fee ?? 15),
    defaultDeliveryRadiusKm: Number(row.default_delivery_radius_km ?? 12),
    roadDistanceFactor: Number(row.road_distance_factor ?? 1.4),
    deliveryFeeTiers: parseFeeTiers(row.delivery_fee_tiers),
    maxStoreSpreadKm: Number(row.max_store_spread_km ?? 2),
    orderingOpensMinute: Number(row.ordering_opens_minute ?? 360),
    orderingClosesMinute: Number(row.ordering_closes_minute ?? 1350),
    storeResponseTimeoutMinutes: Number(row.store_response_timeout_minutes ?? 10),
  };
}

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const { data, error } = await supabase.from('delivery_settings').select(DELIVERY_SETTINGS_SELECT).single();
  if (error) throw error;
  return mapRowToDeliverySettings(data as unknown as DeliverySettingsRow);
}
