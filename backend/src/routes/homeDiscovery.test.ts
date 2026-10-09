// Regression cover for Home discovery fixes: buy-it-again is pin-scoped,
// deactivated stores leave discovery (migration 097), home-tab tiles expose
// real category links (no hardcoded category ids in the app).
import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response, Router } from 'express';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), deliveryStores: vi.fn(), tables: {} as Record<string, unknown[]> }));
vi.mock('../middleware/auth.js', () => ({ requireAuth: vi.fn(), requireRole: () => vi.fn(), requireApproved: vi.fn(), requireActivePartner: vi.fn() }));
vi.mock('../customer-experience/browse.js', async (original) => ({ ...(await original<object>()), deliveryStores: mocks.deliveryStores }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const builder = { select: () => builder, eq: () => builder, in: () => builder, order: () => builder, limit: () => builder,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: mocks.tables[table] ?? [], error: null }).then(resolve) };
    return builder;
  },
} }));

import { ordersRouter } from './orders.js';
import { homeTabsRouter } from './homeTabs.js';

function handler(router: Router, path: string) {
  return router.stack.find(l => l.route?.path === path && l.route.methods.get)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function get(router: Router, path: string, query: Record<string, string> = {}) {
  const res = { json: vi.fn(), set: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler(router, path)({ query, user: { id: 'c1', role: 'customer' } } as unknown as Request, res, next);
  return { json: (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0], next };
}
beforeEach(() => { mocks.rpc.mockReset(); mocks.deliveryStores.mockReset(); mocks.tables = {}; });

it('buy-it-again answers [] without a pin and scopes candidates to stores delivering to lat/lng', async () => {
  mocks.deliveryStores.mockResolvedValueOnce([]);
  expect((await get(ordersRouter, '/buy-it-again')).json).toEqual([]);
  expect(mocks.rpc).not.toHaveBeenCalled();

  mocks.deliveryStores.mockResolvedValueOnce(['s1']);
  mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
  await get(ordersRouter, '/buy-it-again', { lat: '13.2', lng: '74.7' });
  expect(mocks.deliveryStores).toHaveBeenLastCalledWith({ lat: '13.2', lng: '74.7' });
  expect(mocks.rpc).toHaveBeenCalledWith('repeat_purchase_candidates', expect.objectContaining({ p_stores: ['s1'] }));
});

it('migration 097 keeps deactivated stores out of nearby discovery and exposes created_at', () => {
  const sql = readFileSync(new URL('../../migrations/097_discovery_integrity.sql', import.meta.url), 'utf8');
  const fn = sql.slice(sql.indexOf('FUNCTION public.nearby_customer_stores'), sql.indexOf('-- 2.'));
  expect(fn.match(/s\.is_active/g)?.length).toBeGreaterThanOrEqual(2);
  expect(fn).toContain("'created_at'");
});

it('home tabs return real tile links; subcategory links resolve their parent category', async () => {
  mocks.tables = {
    home_tabs: [{ id: 't1', name: 'Bakery', image_url: null }],
    home_tab_tiles: [
      { id: 'a', home_tab_id: 't1', name: 'Breads', image_url: null, link_type: 'subcategory', link_id: 'sub1' },
      { id: 'b', home_tab_id: 't1', name: 'Cakes', image_url: null, link_type: 'category', link_id: 'cat2' },
      { id: 'c', home_tab_id: 't1', name: 'Plain', image_url: null, link_type: null, link_id: null },
    ],
    home_tab_banners: [],
    sub_categories: [{ id: 'sub1', category_id: 'cat1' }],
  };
  const { json } = await get(homeTabsRouter, '/');
  expect(json[0].tiles.map((t: { link: unknown }) => t.link)).toEqual([
    { type: 'subcategory', id: 'sub1', category_id: 'cat1' }, { type: 'category', id: 'cat2', category_id: 'cat2' }, null]);
});
