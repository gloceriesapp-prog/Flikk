import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const mock = vi.hoisted(() => ({ rows: [] as { id: string; name: string; logo_url: string; popular_image_url: string | null; popular_position: number }[], query: null as unknown }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => mock.query } }));
vi.mock('../customer-experience/browse.js', () => ({ deliveryStores: vi.fn() }));
import { categoriesRouter } from './categories.js';
let query: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  query = Object.fromEntries(['select', 'eq', 'not', 'order', 'limit', 'gt'].map(key => [key, vi.fn().mockReturnThis()]));
  Object.assign(query, { then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mock.rows, error: null }).then(resolve) });
  mock.query = query;
  mock.rows = Array.from({ length: 51 }, (_, i) => ({ id: String(i), name: `Brand ${i}`, logo_url: 'https://example.com/logo.png', popular_image_url: null, popular_position: i + 1 }));
});
async function request(path: string, params: Record<string, unknown> = {}) {
  const layer = categoriesRouter.stack.find(item => item.route?.path === path)!;
  const json = vi.fn(); const next = vi.fn();
  await (layer.route.stack[0].handle as RequestHandler)({ query: params } as Request, { json } as unknown as Response, next);
  return { result: json.mock.calls[0]?.[0], next };
}
it('uses active curated brands in admin order and fetches one preview overflow', async () => {
  mock.rows = mock.rows.slice(0, 11);
  mock.rows[0].popular_image_url = 'https://example.com/custom.png';
  const { result } = await request('/popular-brands');
  expect(query.eq).toHaveBeenCalledWith('is_active', true);
  expect(query.not).toHaveBeenCalledWith('popular_position', 'is', null);
  expect(query.order).toHaveBeenCalledWith('popular_position');
  expect(query.limit).toHaveBeenCalledWith(11);
  expect(result[0].imageUrl).toBe('https://example.com/custom.png');
  expect(result[1].imageUrl).toBe('https://example.com/logo.png');
});
it('paginates beyond ten without an unbounded database read', async () => {
  const { result } = await request('/popular-brands/all', { after: '10' });
  expect(query.gt).toHaveBeenCalledWith('popular_position', 10);
  expect(query.limit).toHaveBeenCalledWith(51);
  expect(result.brands).toHaveLength(50);
  expect(result.nextCursor).toBe('50');
  mock.rows = mock.rows.slice(0, 3);
  expect((await request('/popular-brands/all')).result.nextCursor).toBeNull();
});
it.each(['0', '-1', '1.5', '1001', ['1'], 'invalid'])('rejects malformed directory cursor %j', async after => {
  const { next, result } = await request('/popular-brands/all', { after });
  expect(result).toBeUndefined();
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
});
