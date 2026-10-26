// Commission settings (migration 20261026120000): a rate per product
// category, the default for a category without one, and an optional rupee cap
// on one store order's commission. The backend reads these at every checkout
// (backend/src/lib/commission.ts); a store's own rate (Stores → store)
// replaces the category rates for that store.

import { PRODUCT_CATEGORIES } from './product-options';

export interface CategoryCommission {
  category: string;
  // null = no rate of its own: the category pays the default.
  commissionRate: number | null;
}

export interface CommissionSettings {
  defaultRate: number;
  capPerOrder: number | null;
  categories: CategoryCommission[];
}

const MAX_CAP = 100000;

function rate(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${label} must be between 0% and 100%.`);
  return Math.round(n * 10000) / 10000;
}

export function parseCommissionSettings(body: unknown): CommissionSettings {
  const input = (body ?? {}) as { defaultRate?: unknown; capPerOrder?: unknown; categories?: unknown };
  const defaultRate = rate(input.defaultRate, 'The default rate');
  let capPerOrder: number | null = null;
  if (input.capPerOrder != null) {
    const cap = input.capPerOrder;
    if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 0 || cap > MAX_CAP) {
      throw new Error('The cap per order must be empty or an amount from ₹0 to ₹1,00,000.');
    }
    capPerOrder = Math.round(cap * 100) / 100;
  }
  if (!Array.isArray(input.categories) || input.categories.length > 200) throw new Error('Send the list of category rates.');
  const seen = new Set<string>();
  const categories = input.categories.map((row: unknown) => {
    const { category, commissionRate } = (row ?? {}) as { category?: unknown; commissionRate?: unknown };
    const name = typeof category === 'string' ? category.trim() : '';
    if (!name || name.length > 80) throw new Error('Every rate needs a category name.');
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`${name} is listed twice.`);
    seen.add(key);
    return { category: name, commissionRate: commissionRate == null ? null : rate(commissionRate, name) };
  });
  return { defaultRate, capPerOrder, categories };
}

// Every product category in the admin/partner list (in that order), then any
// other category that has a saved rate.
export function withAllCategories(rows: { category: string; commission_rate: unknown }[]): CategoryCommission[] {
  const saved = new Map(rows.map((row) => [row.category.trim().toLowerCase(), { category: row.category, commissionRate: Number(row.commission_rate) }]));
  const listed: CategoryCommission[] = PRODUCT_CATEGORIES.map((category) => {
    const row = saved.get(category.toLowerCase());
    saved.delete(category.toLowerCase());
    return { category, commissionRate: row ? row.commissionRate : null };
  });
  return [...listed, ...[...saved.values()].sort((a, b) => a.category.localeCompare(b.category))];
}
