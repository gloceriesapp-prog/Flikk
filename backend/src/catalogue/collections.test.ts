import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
import { DEFAULT_CONTENT } from '../../../packages/home-content/index.js';
const mocks = vi.hoisted(() => ({ content: {} as unknown, rows: [] as { id: string }[], calls: [] as [string, unknown][], rpc: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { mocks.calls.push([key, value]); return builder; },
      neq: (key: string, value: unknown) => { mocks.calls.push([key, value]); return builder; },
      gt: (key: string, value: unknown) => { mocks.calls.push([key, value]); return builder; },
      in: (_key: string, ids: string[]) => { mocks.calls.push(['hydrate', ids]); return builder; },
      single: async () => ({ data: { content: mocks.content }, error: null }),
      order: () => builder,
      limit: (value: number) => { mocks.calls.push(['limit', value]); return builder; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'products' ? mocks.rows : [], error: null }).then(resolve),
    }; return builder;
  },
} }));
import { collectionRouter, pageSize } from './collections.js';
const store = '72000000-0000-0000-0000-000000000999';
async function request(path: string, query: Record<string, string> = {}, id = store) {
  const handler = collectionRouter.stack.find(layer => layer.route?.path === path).route.stack.at(-1).handle as RequestHandler;
  const res = { json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler({ params: { id }, query } as unknown as Request, res, next); return { res, next };
}
beforeEach(() => { mocks.content = structuredClone(DEFAULT_CONTENT.grocery); mocks.calls.length = 0; mocks.rows = []; mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null }); });
it('rejects malformed and excessive page sizes and cursors', async () => {
  for (const value of ['0', '61', '2oops', ['3']]) expect(() => pageSize(value)).toThrow();
  expect(pageSize(undefined)).toBe(30);
  const result = await request('/:id/collection-products', { after: 'invalid', tab: 'grocery' });
  expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 })); expect(mocks.rpc).not.toHaveBeenCalled();
});
it('does not browse disabled or missing collections', async () => {
  const result = await request('/:id/collection-products', { tab: 'grocery', section: 'missing' });
  expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 })); expect(mocks.rpc).not.toHaveBeenCalled();
});
it('selects bounded preview IDs before hydrating public product rows', async () => {
  await request('/:id/home-preview', { tab: 'grocery' });
  const args = mocks.rpc.mock.calls[0]![1];
  expect(args.p_preview).toBe(true); expect(args.p_store_id).toBe(store);
  expect(args.p_rules.every((r: { limit: number }) => r.limit >= 1 && r.limit <= 24)).toBe(true);
  expect(mocks.calls.some(([key]) => key === 'hydrate')).toBe(false);
});
it('caps full-page hydration and advances cursor even if stock changes during hydration', async () => {
  const section = DEFAULT_CONTENT.grocery.sections.find(s => s.enabled && s.kind === 'products')!;
  const ids = Array.from({ length: 5 }, (_, i) => ({ id: `72000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}` }));
  mocks.rpc.mockResolvedValue({ data: ids, error: null }); mocks.rows = [];
  const result = await request('/:id/collection-products', { tab: 'grocery', section: section.id, limit: '3' });
  expect(mocks.calls).toContainEqual(['hydrate', ids.slice(0, 3).map(p => p.id)]);
  expect(result.res.json).toHaveBeenCalledWith({ products: [], nextCursor: ids[2]!.id });
});
it('does not fall back to an unbounded read if the selector RPC fails', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: new Error('RPC unavailable') });
  const result = await request('/:id/home-preview', { tab: 'grocery' });
  expect(result.next).toHaveBeenCalledWith(expect.any(Error)); expect(mocks.calls.some(([key]) => key === 'hydrate')).toBe(false);
});
it('filters and sorts the whole store catalogue in SQL with a bounded keyset page', async () => {
  const ids = Array.from({ length: 3 }, (_, i) => ({ id: `72000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`, score: -10 * i }));
  mocks.rpc.mockResolvedValue({ data: ids, error: null });
  const first = await request('/:id/products-page', { limit: '2', category: 'Dairy', veg: '1', deals: '1', price: 'under_100', sort: 'price_low' });
  expect(mocks.rpc).toHaveBeenCalledWith('store_product_page_ids', expect.objectContaining({
    p_store: store, p_category: 'Dairy', p_veg: true, p_deals: true, p_price_band: 'under_100', p_sort: 'price_low', p_after_score: null, p_limit: 3 }));
  expect(mocks.calls).toContainEqual(['hydrate', ids.slice(0, 2).map(p => p.id)]);
  expect(mocks.calls).toContainEqual(['approval_status', 'approved']);
  const { nextCursor } = (first.res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { nextCursor: string };
  expect(nextCursor).toEqual(expect.any(String));
  await request('/:id/products-page', { limit: '2', category: 'Dairy', veg: '1', deals: '1', price: 'under_100', sort: 'price_low', after: nextCursor });
  expect(mocks.rpc).toHaveBeenLastCalledWith('store_product_page_ids', expect.objectContaining({ p_after_score: -10, p_after_id: ids[1]!.id }));
  // A cursor from one filter set cannot be replayed against another.
  const replay = await request('/:id/products-page', { limit: '2', sort: 'price_high', after: nextCursor });
  expect(replay.next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
});
it('rejects unknown store filters before querying', async () => {
  for (const query of [{ sort: 'newest' }, { price: 'cheap' }, { category: 'x'.repeat(101) }]) {
    const result = await request('/:id/products-page', query);
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('serves store sidebar categories from a server facet query', async () => {
  mocks.rpc.mockResolvedValue({ data: [{ category: 'Dairy', product_count: '4', image_url: null }], error: null });
  const result = await request('/:id/category-facets');
  expect(mocks.rpc).toHaveBeenCalledWith('store_category_facets', { p_store: store });
  expect(result.res.json).toHaveBeenCalledWith([{ category: 'Dairy', productCount: 4, imageUrl: null }]);
});

it('hydrates sold-out previews without losing approval or store scope', async () => {
  mocks.rpc.mockResolvedValue({ data: [{ id: store }], error: null });
  await request('/:id/home-preview', { tab: 'grocery' });
  expect(mocks.calls).not.toContainEqual(['stock_status', 'out_of_stock']);
  expect(mocks.calls).toContainEqual(['approval_status', 'approved']);
  expect(mocks.calls).toContainEqual(['store_id', store]);
});
