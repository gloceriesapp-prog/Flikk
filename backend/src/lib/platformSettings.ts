// Real, admin-editable platform config — currently just the commission
// rate (platform_settings singleton, migrations/039). Separate from
// lib/pricing.ts (deliberately DB-free "money math") and from
// delivery_settings (that table has a public read RLS policy every app
// needs at checkout — commission rate never should, see the migration's
// own note).

import { supabase } from '../db/supabase.js';
import { DEFAULT_COMMISSION_RATE } from './pricing.js';

// Read fresh on every checkout rather than cached in memory — a rate
// change from admin should apply to the very next order, not wait for a
// process restart or a cache-invalidation mechanism that doesn't exist yet.
// One extra indexed-by-PK row read per checkout is negligible next to the
// rest of the order-creation work already happening in the same request.
export async function getCommissionRate(): Promise<number> {
  const { data, error } = await supabase.from('platform_settings').select('commission_rate').limit(1).maybeSingle();
  if (error || !data) return DEFAULT_COMMISSION_RATE;
  return Number(data.commission_rate);
}

// Effective commission per store (migration 115): the store's own
// stores.commission_rate when admin set one, else the platform default
// above. Every requested id gets an entry (an unknown store gets the
// default). Only a database without store_commission_rates (115 not applied
// yet) falls back to the platform rate; any other error fails the checkout
// rather than charging a store the wrong rate.
export interface StoreCommission {
  rate: number;
  isStoreOverride: boolean;
}

export async function getStoreCommissionRates(storeIds: string[]): Promise<Map<string, StoreCommission>> {
  const ids = [...new Set(storeIds)];
  const result = new Map<string, StoreCommission>();
  const { data, error } = await supabase.rpc('store_commission_rates', { p_stores: ids });
  if (error && error.code !== 'PGRST202' && error.code !== '42883') throw error;
  for (const row of (error ? [] : (data ?? [])) as { store_id: string; commission_rate: unknown; is_override: boolean }[]) {
    result.set(row.store_id, { rate: Number(row.commission_rate), isStoreOverride: row.is_override === true });
  }
  if (ids.some((id) => !result.has(id))) {
    const rate = await getCommissionRate();
    for (const id of ids) if (!result.has(id)) result.set(id, { rate, isStoreOverride: false });
  }
  return result;
}

export async function getStoreCommissionRate(storeId: string): Promise<StoreCommission> {
  return (await getStoreCommissionRates([storeId])).get(storeId)!;
}

// Promotions kill switch (platform_settings.promotions_enabled, migration
// 112). Fails closed: no row, a read error or a pre-112 schema means off.
export async function promotionsSwitchOn(): Promise<boolean> {
  const { data, error } = await supabase.from('platform_settings').select('promotions_enabled').limit(1).maybeSingle();
  return !error && (data as { promotions_enabled?: unknown } | null)?.promotions_enabled === true;
}

// Checkout settings (platform_settings, migration 117): which payment methods
// the admin has switched on and the platform-wide minimum order value (item
// subtotal, rupees). Read fresh on every checkout, like the commission rate.
// A read error or a pre-117 schema falls back to the old behaviour: both
// methods on (env and Cashfree keys still decide) and no minimum.
export interface CheckoutControls {
  codEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  minOrderValue: number;
}

export const DEFAULT_CHECKOUT_CONTROLS: CheckoutControls = { codEnabled: true, onlinePaymentsEnabled: true, minOrderValue: 0 };

export function parseCheckoutControls(row: unknown): CheckoutControls {
  const r = (row ?? {}) as { cod_enabled?: unknown; online_payments_enabled?: unknown; min_order_value?: unknown };
  const min = Number(r.min_order_value);
  return {
    codEnabled: r.cod_enabled !== false,
    onlinePaymentsEnabled: r.online_payments_enabled !== false,
    minOrderValue: Number.isFinite(min) && min > 0 ? min : 0,
  };
}

export async function getCheckoutControls(): Promise<CheckoutControls> {
  const { data, error } = await supabase.from('platform_settings').select('cod_enabled, online_payments_enabled, min_order_value').limit(1).maybeSingle();
  if (error || !data) return DEFAULT_CHECKOUT_CONTROLS;
  return parseCheckoutControls(data);
}
