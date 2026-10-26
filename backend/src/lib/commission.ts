// Commission by product category (migration 20261026120000).
//
// Each cart line pays the rate of its product's category
// (category_commission_rates, set in admin). A category without its own rate
// pays the platform default (platform_settings.commission_rate). A store with
// its own rate (stores.commission_rate, 115) pays that rate on every line
// instead. platform_settings.commission_cap_per_order, when set, caps one
// store order's commission in rupees.
//
// storeCommissions() is the pure rule; loadCommissionRules() and
// getStoreCommissions() read the database at checkout, fresh every time so an
// admin change applies to the very next order.

import { supabase } from '../db/supabase.js';
import { getCommissionRate, getStoreCommissionRates, type StoreCommission } from './platformSettings.js';
import { round2 } from './pricing.js';

export interface CommissionRules {
  defaultRate: number;
  capPerOrder: number | null;
  // Keyed by categoryKey().
  categoryRates: Map<string, number>;
  stores: Map<string, StoreCommission>;
}

export interface CommissionLine {
  product_id: string;
  store_id: string;
  unit_price_at_order: number;
  quantity: number;
}

export function categoryKey(category: string | null | undefined): string {
  return (category ?? '').trim().toLowerCase();
}

function assertRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error(`commission rate out of range: ${rate}`);
  return rate;
}

// The rate one line pays: the store's own rate, else its category's rate,
// else the platform default.
export function lineCommissionRate(rules: CommissionRules, storeId: string, category: string | null | undefined): number {
  const store = rules.stores.get(storeId);
  if (store?.isStoreOverride) return assertRate(store.rate);
  return assertRate(rules.categoryRates.get(categoryKey(category)) ?? rules.defaultRate);
}

// Commission per store for a priced cart: each line at its own rate, summed
// per store, rounded to paise, then capped.
export function storeCommissions(lines: CommissionLine[], categories: Map<string, string>, rules: CommissionRules): Map<string, number> {
  const raw = new Map<string, number>();
  for (const line of lines) {
    const rate = lineCommissionRate(rules, line.store_id, categories.get(line.product_id));
    raw.set(line.store_id, (raw.get(line.store_id) ?? 0) + line.unit_price_at_order * line.quantity * rate);
  }
  const result = new Map<string, number>();
  for (const [storeId, amount] of raw) {
    const rounded = round2(amount);
    result.set(storeId, rules.capPerOrder == null ? rounded : round2(Math.min(rounded, rules.capPerOrder)));
  }
  return result;
}

// Missing table/column = migration not applied yet: fall back to the flat
// platform default (the behaviour before this change). Any other error fails
// the checkout rather than charging a store the wrong amount.
const NOT_DEPLOYED = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

async function loadCategoryRates(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('category_commission_rates').select('category, commission_rate');
  if (error) {
    if (NOT_DEPLOYED.has(error.code)) return new Map();
    throw error;
  }
  return new Map(((data ?? []) as { category: string; commission_rate: unknown }[])
    .map((row) => [categoryKey(row.category), Number(row.commission_rate)]));
}

async function loadCap(): Promise<number | null> {
  const { data, error } = await supabase.from('platform_settings').select('commission_cap_per_order').limit(1).maybeSingle();
  if (error) {
    if (NOT_DEPLOYED.has(error.code)) return null;
    throw error;
  }
  const cap = (data as { commission_cap_per_order?: unknown } | null)?.commission_cap_per_order;
  if (cap == null) return null;
  const value = Number(cap);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function loadCommissionRules(storeIds: string[]): Promise<CommissionRules> {
  const [defaultRate, capPerOrder, categoryRates, stores] = await Promise.all([
    getCommissionRate(), loadCap(), loadCategoryRates(), getStoreCommissionRates(storeIds),
  ]);
  return { defaultRate, capPerOrder, categoryRates, stores };
}

async function loadProductCategories(productIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('products').select('id, category').in('id', ids);
  if (error) throw error;
  return new Map(((data ?? []) as { id: string; category: string | null }[]).map((row) => [row.id, row.category ?? '']));
}

// What each store in a priced cart pays, keyed by store id.
export async function getStoreCommissions(lines: CommissionLine[]): Promise<Map<string, number>> {
  const [rules, categories] = await Promise.all([
    loadCommissionRules(lines.map((line) => line.store_id)),
    loadProductCategories(lines.map((line) => line.product_id)),
  ]);
  return storeCommissions(lines, categories, rules);
}

// The rates a store's new orders are charged, for the partner app.
export interface StoreCommissionCard {
  commissionRate: number;
  isStoreOverride: boolean;
  capPerOrder: number | null;
  categoryRates: { category: string; commissionRate: number }[];
}

export async function getStoreCommissionCard(storeId: string): Promise<StoreCommissionCard> {
  const [rules, rows] = await Promise.all([
    loadCommissionRules([storeId]),
    supabase.from('category_commission_rates').select('category, commission_rate').order('commission_rate').order('category'),
  ]);
  const store = rules.stores.get(storeId)!;
  if (rows.error && !NOT_DEPLOYED.has(rows.error.code)) throw rows.error;
  const categoryRates = store.isStoreOverride ? [] : ((rows.error ? [] : rows.data ?? []) as { category: string; commission_rate: unknown }[])
    .map((row) => ({ category: row.category, commissionRate: Number(row.commission_rate) }));
  return {
    commissionRate: store.isStoreOverride ? store.rate : rules.defaultRate,
    isStoreOverride: store.isStoreOverride,
    capPerOrder: rules.capPerOrder,
    categoryRates,
  };
}
