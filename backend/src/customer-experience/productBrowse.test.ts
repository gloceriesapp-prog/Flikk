import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), nearby: vi.fn(), fromBrand: vi.fn(), fromProducts: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    if (table === 'brands') return mocks.fromBrand();
    const override = mocks.fromProducts();
    if (override) return override;
    const builder = { select: () => builder, in: () => builder, eq: () => builder,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: 'p2' }, { id: 'p1' }], error: null }).then(resolve) };
    return builder;
  },
} }));
vi.mock('../discovery/nearbyStores.js', async (original) => ({ ...(await original<object>()), nearbyStores: mocks.nearby }));
import { popularityDays, productBrowseRouter } from './productBrowse.js';
async function request(path: string, query: Record<string, string>, params: Record<string, string> = {}) {
  const handler = productBrowseRouter.stack.find(layer => layer.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler({ query, params } as unknown as Request, res, next); return { res, next };
}
const pin = { lat: '13.27', lng: '74.75' };
beforeEach(() => { mocks.fromBrand.mockReset(); mocks.fromProducts.mockReset(); mocks.rpc.mockReset().mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], error: null }); mocks.nearby.mockReset().mockResolvedValue([{ id: 's1' }]); });
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
it('home picks group pinned products by section in pin order, only from delivery stores', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ section_key: 'trending', id: 'p2' }, { section_key: 'trending', id: 'p1' }, { section_key: 'custom-diwali1', id: 'p1' }, { section_key: 'trending', id: 'gone' }], error: null });
  const { res } = await request('/home-picks', pin);
  expect(mocks.rpc).toHaveBeenCalledWith('home_pick_product_ids', { p_stores: ['s1'] });
  expect(res.json).toHaveBeenCalledWith({ trending: [{ id: 'p2' }, { id: 'p1' }], 'custom-diwali1': [{ id: 'p1' }] });
  mocks.rpc.mockClear();
  const empty = await request('/home-picks', {});
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(empty.res.json).toHaveBeenCalledWith({});
});

it('uses category-aware previews when the client supports category navigation', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [{ section_key: 'trending', id: 'p1' }], error: null });
  const { res } = await request('/home-picks', { ...pin, category_sources: '1' });
  expect(mocks.rpc).toHaveBeenCalledWith('home_section_preview_ids', { p_stores: ['s1'] });
  expect(res.json).toHaveBeenCalledWith({ trending: [{ id: 'p1' }] });
});

it('pages only the chosen brand at delivery stores and applies customer prices', async () => {
  const brandId = '00000000-0000-4000-8000-000000000101';
  const brand = { id: brandId, name: 'Brand', popular_banner_url: 'https://example.test/banner.png', popular_image_url: null, logo_url: 'https://example.test/logo.png' };
  const brandQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: brand, error: null }) };
  mocks.fromBrand.mockReturnValue(brandQuery);
  const first = {
    id: '00000000-0000-4000-8000-000000000201',
    product_variants: [{ price: 20, platform_markup: 5, original_price: 30, is_default: true }],
  };
  const second = { ...first, id: '00000000-0000-4000-8000-000000000202' };
  const productQuery = {
    select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [first, second], error: null }).then(resolve),
  };
  mocks.fromProducts.mockReturnValue(productQuery);

  const initial = await request('/brand/:id', { ...pin, limit: '1' }, { id: brandId });
  expect(initial.next).not.toHaveBeenCalled();
  expect(productQuery.eq).toHaveBeenCalledWith('brand_id', brandId);
  expect(productQuery.in).toHaveBeenCalledWith('store_id', ['s1']);
  expect(productQuery.eq).toHaveBeenCalledWith('approval_status', 'approved');
  const result = vi.mocked(initial.res.json).mock.calls[0]![0];
  expect(result.brand.bannerUrl).toBe('https://example.test/banner.png');
  expect(result.brand.imageUrl).toBe('https://example.test/logo.png');
  expect(result.products).toEqual([{ ...first, price: 25, original_price: 30, product_variants: [{ price: 25, original_price: 30, is_default: true }] }]);

  await request('/brand/:id', { ...pin, limit: '1', after: result.nextCursor }, { id: brandId });
  expect(productQuery.gt).toHaveBeenCalledWith('id', first.id);

  mocks.nearby.mockResolvedValueOnce([{ id: 'different-store' }]);
  const changed = await request('/brand/:id', { ...pin, after: result.nextCursor }, { id: brandId });
  expect(changed.next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_CURSOR' }));
});
