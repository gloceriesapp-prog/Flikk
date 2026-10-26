import { beforeEach, expect, it, vi } from 'vitest';

// Commission by product category (migration 20261026120000).
const db = vi.hoisted(() => ({
  categoryRows: [] as { category: string; commission_rate: string }[] | null,
  categoryError: null as { code: string } | null,
  cap: '30' as string | null,
  capError: null as { code: string } | null,
  products: [] as { id: string; category: string }[],
}));
const settings = vi.hoisted(() => ({ defaultRate: 0.04, stores: new Map<string, { rate: number; isStoreOverride: boolean }>() }));

vi.mock('../db/supabase.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'category_commission_rates') {
        const result = () => Promise.resolve({ data: db.categoryError ? null : db.categoryRows, error: db.categoryError });
        const query = { select: () => query, order: () => query, then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => result().then(resolve, reject) };
        return query;
      }
      if (table === 'platform_settings') {
        const query = { select: () => query, limit: () => query,
          maybeSingle: async () => ({ data: db.capError ? null : { commission_cap_per_order: db.cap }, error: db.capError }) };
        return query;
      }
      const query = { select: () => query, in: async (_column: string, ids: string[]) => ({ data: db.products.filter((p) => ids.includes(p.id)), error: null }) };
      return query;
    },
  },
}));
vi.mock('./platformSettings.js', () => ({
  getCommissionRate: async () => settings.defaultRate,
  getStoreCommissionRates: async (ids: string[]) => new Map(ids.map((id) => [id, settings.stores.get(id) ?? { rate: settings.defaultRate, isStoreOverride: false }])),
}));

import { getStoreCommissionCard, getStoreCommissions, lineCommissionRate, storeCommissions, type CommissionRules } from './commission.js';

const line = (product_id: string, store_id: string, unit_price_at_order: number, quantity = 1) => ({ product_id, store_id, unit_price_at_order, quantity });

beforeEach(() => {
  db.categoryRows = [
    { category: 'Dairy, Bread & Eggs', commission_rate: '0' },
    { category: 'Meat, Eggs & Fish', commission_rate: '0.02' },
    { category: 'Personal Care', commission_rate: '0.08' },
  ];
  db.categoryError = null; db.cap = '30'; db.capError = null;
  db.products = [
    { id: 'milk', category: 'Dairy, Bread & Eggs' },
    { id: 'chicken', category: 'Meat, Eggs & Fish' },
    { id: 'shampoo', category: ' personal care ' },
    { id: 'biscuit', category: 'Bakery & Biscuits' },
  ];
  settings.defaultRate = 0.04; settings.stores = new Map();
});

it('charges each item its category rate and the default for a category without one', async () => {
  const totals = await getStoreCommissions([
    line('milk', 'shop', 60, 2),     // 0%  -> 0
    line('chicken', 'shop', 250),    // 2%  -> 5
    line('shampoo', 'shop', 100),    // 8%  -> 8 (category matched ignoring case/spaces)
    line('biscuit', 'shop', 50),     // default 4% -> 2
  ]);
  expect(totals.get('shop')).toBe(15);
});

it('takes nothing on a milk-only order', async () => {
  expect((await getStoreCommissions([line('milk', 'shop', 30, 4)])).get('shop')).toBe(0);
});

it('caps one store order and keeps each store of a trip separate', async () => {
  db.cap = '30';
  const totals = await getStoreCommissions([line('shampoo', 'a', 1000), line('chicken', 'b', 100)]);
  expect(totals.get('a')).toBe(30);
  expect(totals.get('b')).toBe(2);
});

it('lets a store’s own rate replace every category rate', async () => {
  settings.stores.set('deal', { rate: 0.01, isStoreOverride: true });
  expect((await getStoreCommissions([line('shampoo', 'deal', 200), line('milk', 'deal', 100)])).get('deal')).toBe(3);
});

it('falls back to the flat default before the migration is applied', async () => {
  db.categoryError = { code: '42P01' }; db.capError = { code: '42703' };
  expect((await getStoreCommissions([line('milk', 'shop', 100), line('shampoo', 'shop', 100)])).get('shop')).toBe(8);
});

it('fails the checkout on any other database error rather than guess', async () => {
  db.categoryError = { code: '57014' };
  await expect(getStoreCommissions([line('milk', 'shop', 100)])).rejects.toMatchObject({ code: '57014' });
});

it('rounds to paise and treats an unknown product as the default', () => {
  const rules: CommissionRules = { defaultRate: 0.04, capPerOrder: null, categoryRates: new Map([['beverages', 0.025]]), stores: new Map() };
  expect(storeCommissions([line('juice', 's', 33.33, 3), line('gone', 's', 10)], new Map([['juice', 'Beverages']]), rules).get('s')).toBe(2.9);
  expect(() => lineCommissionRate({ ...rules, defaultRate: 2 }, 's', 'Unknown')).toThrow('out of range');
});

it('shows the store its rate card: category rates, default and cap', async () => {
  expect(await getStoreCommissionCard('shop')).toEqual({
    commissionRate: 0.04, isStoreOverride: false, capPerOrder: 30,
    categoryRates: [
      { category: 'Dairy, Bread & Eggs', commissionRate: 0 },
      { category: 'Meat, Eggs & Fish', commissionRate: 0.02 },
      { category: 'Personal Care', commissionRate: 0.08 },
    ],
  });
  settings.stores.set('deal', { rate: 0.01, isStoreOverride: true });
  expect(await getStoreCommissionCard('deal')).toEqual({ commissionRate: 0.01, isStoreOverride: true, capPerOrder: 30, categoryRates: [] });
});
