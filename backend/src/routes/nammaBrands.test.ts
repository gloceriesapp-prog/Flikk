import { beforeEach, expect, it, vi } from 'vitest';

const tables: Record<string, { data: unknown; error: null }> = {};
// Chainable stand-in for the Supabase query builder: every filter returns
// the same builder; awaiting it (or maybeSingle) yields the table's rows.
function builder(table: string) {
  const result = () => tables[table] ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq', 'in', 'is', 'order', 'limit']) chain[method] = () => chain;
  chain.maybeSingle = async () => result();
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return chain;
}
vi.mock('../db/supabase.js', () => ({
  supabase: { from: (table: string) => builder(table), rpc: async () => ({ data: [{ id: 'p-top' }], error: null }) },
}));
vi.mock('../customer-experience/browse.js', () => ({ deliveryStores: vi.fn(async () => ['s1']) }));
vi.mock('../lib/customerPrice.js', () => ({ applyCustomerPrices: (rows: unknown) => rows }));

const { nammaBrandsRouter, DEFAULT_NAMMA_HEADER } = await import('./nammaBrands.js');

async function get() {
  const layer = (nammaBrandsRouter as unknown as { stack: { route: { stack: { handle: (req: unknown, res: unknown, next: unknown) => Promise<void> }[] } }[] }).stack[0]!;
  const res = { json: vi.fn() };
  const next = vi.fn();
  await layer.route.stack[0]!.handle({ query: { lat: '13.3', lng: '74.7' } }, res, next);
  expect(next).not.toHaveBeenCalled();
  return res.json.mock.calls[0]![0];
}

const brand = (id: string, name: string) => ({ id, name, logo_url: `https://x/${id}.png`, popular_image_url: null, popular_banner_url: null, is_active: true });

beforeEach(() => { for (const key of Object.keys(tables)) delete tables[key]; });

it('returns nothing while the section is switched off', async () => {
  tables.home_sections = { data: { enabled: false, starts_at: null, ends_at: null, banner_image_url: null }, error: null };
  expect(await get()).toEqual({ enabled: false, headerImageUrl: null, cards: [] });
});

it('builds cards from live stock, hiding brands with nothing in stock nearby', async () => {
  tables.home_sections = { data: { enabled: true, starts_at: null, ends_at: null, banner_image_url: null }, error: null };
  tables.home_brand_cards = { data: [
    { brand_id: 'b1', title: null, product_ids: [], pill_mode: 'discount', brands: brand('b1', 'Shetty Masala') },
    { brand_id: 'b2', title: 'Udupi Snacks', product_ids: ['p3'], pill_mode: 'lowest_price', brands: brand('b2', 'Udupi Co') },
    { brand_id: 'b3', title: null, product_ids: [], pill_mode: 'discount', brands: brand('b3', 'Empty Brand') },
  ], error: null };
  tables.products = { data: [
    { id: 'p1', brand_id: 'b1', image_url: 'https://img/p1', price: 80, original_price: 100 },
    { id: 'p-top', brand_id: 'b1', image_url: 'https://img/top', price: 45, original_price: 50 },
    { id: 'p3', brand_id: 'b2', image_url: 'https://img/p3', price: 35, original_price: null },
  ], error: null };
  const body = await get();
  expect(body.headerImageUrl).toBe(DEFAULT_NAMMA_HEADER);
  expect(body.cards).toEqual([
    { brand: { id: 'b1', name: 'Shetty Masala', imageUrl: 'https://x/b1.png', bannerUrl: null }, title: 'Shetty Masala', imageUrls: ['https://img/top', 'https://img/p1'], pill: 'Upto 20% Off' },
    { brand: { id: 'b2', name: 'Udupi Co', imageUrl: 'https://x/b2.png', bannerUrl: null }, title: 'Udupi Snacks', imageUrls: ['https://img/p3'], pill: 'Starting from ₹35' },
  ]);
});
