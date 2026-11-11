import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => {
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    let limit = Infinity;
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters.push((r) => r[key] === value); return chain; },
      neq: (key: string, value: unknown) => { filters.push((r) => r[key] != null && r[key] !== value); return chain; },
      gt: (key: string, value: string) => { filters.push((r) => String(r[key]) > value); return chain; },
      in: (key: string, values: unknown[]) => { filters.push((r) => values.includes(r[key])); return chain; },
      not: (key: string) => { filters.push((r) => r[key] != null); return chain; },
      or: (expression: string) => {
        const parts = expression.split(',').map((term) => term.split('.'));
        filters.push((r) => parts.some(([key, operator, value]) => operator === 'is' ? r[key!] == null : r[key!] != null && r[key!] !== value));
        return chain;
      },
      order: () => chain,
      limit: (value: number) => { limit = value; return chain; },
      maybeSingle: async () => ({ data: fixture.rows.find((r) => filters.every((f) => f(r))) ?? null, error: null }),
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: fixture.rows.filter((r) => filters.every((f) => f(r))).sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(0, limit), error: null }).then(resolve),
    };
    return chain;
  },
} }));
import { similarProductPage } from './similarProducts.js';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const brand = uuid(99), subcategory = uuid(98), source = uuid(1);
const row = (n: number, patch = {}) => ({ id: uuid(n), store_id: 'nearby', category: 'Drinks', sub_category_id: subcategory, brand_id: brand,
  approval_status: 'approved', preorder_enabled: false, is_in_stock: true, stock_status: 'in_stock', image_url: 'https://cdn.example/a.webp', ...patch });
beforeEach(() => { fixture.rows = [row(1), row(2, { brand_id: null }), row(3, { sub_category_id: uuid(97) }), row(4, { brand_id: uuid(96), sub_category_id: uuid(97) })]; });
it('ranks the same brand first, then subcategory, then broader related category', async () => {
  const result = await similarProductPage({ exclude: source, limit: '6' }, ['nearby'], '*');
  expect(result.products.map((r) => r.id)).toEqual([uuid(3), uuid(2), uuid(4)]);
  expect(result.nextCursor).toBeNull();
});
it('fills short matches without recommending unrelated, unavailable or inaccessible stock', async () => {
  fixture.rows.push(row(5, { category: 'Laundry' }), row(6, { store_id: 'far-away' }), row(7, { approval_status: 'pending' }), row(8, { is_in_stock: false }), row(9, { preorder_enabled: true }));
  expect((await similarProductPage({ exclude: source }, ['nearby'], '*')).products).toHaveLength(3);
});
it('paginates across tier boundaries without duplicates or skipped related products', async () => {
  const all: unknown[] = [];
  let after: string | undefined;
  do {
    const result = await similarProductPage({ exclude: source, limit: '1', ...(after ? { after } : {}) }, ['nearby'], '*');
    all.push(...result.products.map((r) => r.id)); after = result.nextCursor ?? undefined;
  } while (after);
  expect(all).toEqual([uuid(3), uuid(2), uuid(4)]);
});
it('handles missing brands/subcategories and empty delivery coverage', async () => {
  fixture.rows[0] = row(1, { brand_id: null, sub_category_id: null });
  expect((await similarProductPage({ exclude: source }, ['nearby'], '*')).products).toHaveLength(3);
  expect(await similarProductPage({ exclude: source }, [], '*')).toEqual({ products: [], nextCursor: null });
});
it('binds page cursors to their source and validates requested identifiers', async () => {
  const page = await similarProductPage({ exclude: source, limit: '1' }, ['nearby'], '*');
  await expect(similarProductPage({ exclude: uuid(2), after: page.nextCursor! }, ['nearby'], '*')).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
  await expect(similarProductPage({ exclude: 'not-an-id' }, ['nearby'], '*')).rejects.toThrow();
});
