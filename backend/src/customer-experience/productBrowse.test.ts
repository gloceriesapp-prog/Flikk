import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), nearby: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => {
    const builder = { select: () => builder, in: () => builder, eq: () => builder,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: 'p2' }, { id: 'p1' }], error: null }).then(resolve) };
    return builder;
  },
} }));
vi.mock('../discovery/nearbyStores.js', async (original) => ({ ...(await original<object>()), nearbyStores: mocks.nearby }));
import { popularityDays, productBrowseRouter } from './productBrowse.js';
async function request(path: string, query: Record<string, string>) {
  const handler = productBrowseRouter.stack.find(layer => layer.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler({ query } as unknown as Request, res, next); return { res, next };
}
const pin = { lat: '13.27', lng: '74.75' };
beforeEach(() => { mocks.rpc.mockReset().mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], error: null }); mocks.nearby.mockReset().mockResolvedValue([{ id: 's1' }]); });
it('accepts only 7- or 30-day popularity windows', () => {
  expect(popularityDays(undefined)).toBe(7); expect(popularityDays('30')).toBe(30);
  for (const value of ['14', '0', ['7']]) expect(() => popularityDays(value)).toThrow();
});
it('Most Bought (30d) and Trending (7d) query different windows and keep rank order', async () => {
  const { res } = await request('/popular', { ...pin, days: '30' });
  expect(mocks.rpc).toHaveBeenCalledWith('popular_customer_product_ids', { p_stores: ['s1'], p_days: 30 });
  expect(res.json).toHaveBeenCalledWith([{ id: 'p1' }, { id: 'p2' }]);
  await request('/popular', pin);
  expect(mocks.rpc).toHaveBeenLastCalledWith('popular_customer_product_ids', { p_stores: ['s1'], p_days: 7 });
});
it('deals rank by discount through a bounded RPC and are empty without a pin', async () => {
  await request('/deals', pin);
  expect(mocks.rpc).toHaveBeenCalledWith('deal_customer_product_ids', { p_stores: ['s1'], p_limit: 20 });
  mocks.rpc.mockClear();
  const { res } = await request('/deals', {});
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(res.json).toHaveBeenCalledWith([]);
});
