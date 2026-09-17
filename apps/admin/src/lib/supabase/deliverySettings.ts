// Maps between the real public.delivery_settings row (a guaranteed
// singleton — migrations/029_delivery_settings.sql) and this dashboard's
// DeliverySettings type. Covered by the public delivery_settings_read_all
// RLS policy, same rationale as lib/supabase/homeTabs.ts's own note.
// Writes live in app/api/delivery-settings/route.ts instead (service_role,
// since there's no owner_user_id here for a normal RLS write policy to
// check against — this is a single zone-wide config, not a per-owner row).

import { supabase } from './client';

export interface DeliverySettingsRow {
  id: string;
  flat_delivery_fee: number;
  free_delivery_enabled: boolean;
  free_delivery_threshold: number;
}

export interface DeliverySettings {
  id: string;
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
}

export const DELIVERY_SETTINGS_SELECT = 'id, flat_delivery_fee, free_delivery_enabled, free_delivery_threshold';

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
  };
}

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const { data, error } = await supabase.from('delivery_settings').select(DELIVERY_SETTINGS_SELECT).single();
  if (error) throw error;
  return mapRowToDeliverySettings(data as unknown as DeliverySettingsRow);
}
