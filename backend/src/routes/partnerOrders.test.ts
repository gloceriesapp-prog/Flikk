import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const db = vi.hoisted(() => ({ filters: [] as [string, ...unknown[]][], row: null as Record<string, unknown> | null, error: null as { code: string; message?: string } | null, rpcs: [] as unknown[] }));
vi.mock('../stores/access.js', () => ({ requireStoreAccess: vi.fn(async () => ({ storeId: 'owned-store', role: 'owner' })) }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    db.filters.push(['from', table]);
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'or', 'order', 'ilike', 'in']) chain[method] = (...args: unknown[]) => { db.filters.push([method, ...args]); return chain; };
    chain.maybeSingle = chain.single = async () => ({ data: db.row, error: db.error });
    chain.limit = () => ({
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: db.row ? [db.row] : [], error: db.error }).then(resolve),
      overrideTypes: async () => ({ data: db.row ? [db.row] : [], error: db.error }),
    });
    return chain;
  },
  rpc: async (...args: unknown[]) => { db.rpcs.push(args); return { data: db.row, error: db.error }; },
} }));
import { partnerRouter } from './partner.js';
async function request(method: string, path: string, query: Record<string, unknown> = {}) {
  const handler = partnerRouter.stack.find(layer => layer.route?.path === path && (layer.route as unknown as { methods: Record<string, boolean> }).methods[method])!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { json: vi.fn(), set: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'owner' }, params: { id: 'order-1' }, query } as unknown as Request, res, next);
  return { res, error: next.mock.calls[0]?.[0] };
}
beforeEach(() => { db.filters = []; db.row = { id: 'order-1', status: 'placed' }; db.error = null; db.rpcs = []; });
it('filters unpaid/rejected orders before pagination, scoped to the authenticated store', async () => {
  await request('get', '/orders', { view: 'queue' });
  expect(db.filters).toContainEqual(['eq', 'store_id', 'owned-store']);
  expect(db.filters).toContainEqual(['or', 'payment_method.eq.cod,provider_payment_id.not.is.null']);
  expect(db.filters).toContainEqual(['eq', 'checkout_payment_rejected', false]);
});
it('loads a notification order directly without relying on the queue and can return cancellation', async () => {
  db.row = { id: 'order-1', status: 'cancelled' };
  const { res, error } = await request('get', '/orders/:id');
  expect(error).toBeUndefined();
  expect(db.filters).toContainEqual(['eq', 'store_id', 'owned-store']);
  expect(db.filters).toContainEqual(['eq', 'id', 'order-1']);
  expect(res.json).toHaveBeenCalledWith(db.row);
});
it('missing/foreign/unpaid notification details return unavailable, while outages remain errors', async () => {
  db.row = null;
  expect((await request('get', '/orders/:id')).error).toMatchObject({ status: 404 });
  db.error = { code: '08006' };
  expect((await request('get', '/orders/:id')).error).toBe(db.error);
});
it('accepts with server-scoped identity and returns the complete detail DTO', async () => {
  const { res, error } = await request('post', '/orders/:id/accept');
  expect(error).toBeUndefined();
  expect(db.rpcs).toEqual([['partner_accept_order', { p_order: 'order-1', p_store: 'owned-store', p_user: 'owner' }]]);
  expect(res.json).toHaveBeenCalledWith(db.row);
});
it('does not pretend acceptance succeeded when the transaction rejects an expired order', async () => {
  db.error = { code: 'P0409', message: 'ACCEPTANCE_EXPIRED' };
  const { res, error } = await request('post', '/orders/:id/accept');
  expect(error).toMatchObject({ code: 'ACCEPTANCE_EXPIRED', status: 409 });
  expect(res.json).not.toHaveBeenCalled();
});

it('reads a bounded lightweight queue digest and scopes it before returning a version', async () => {
  const { res, error } = await request('get', '/orders/updates'); expect(error).toBeUndefined();
  expect(db.filters).toContainEqual(['eq', 'store_id', 'owned-store']);
  expect(db.filters).toContainEqual(['or', 'status.in.(placed,packed,out_for_delivery)']);
  expect(db.filters.find(row => row[0] === 'select')?.[1]).not.toContain('order_items');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ version: expect.any(String), hasMore: false }));
});
it('history permits cancelled/problem states and escapes wildcard search without filter interpolation', async () => {
  await request('get', '/orders', { view: 'history', search: 'a,b%', status: 'cancelled', summary: '1' });
  expect(db.filters).toContainEqual(['eq', 'status', 'cancelled']);
  expect(db.filters).toContainEqual(['ilike', 'order_number', '%a,b\\%%']);
  expect(db.filters).toContainEqual(['select', 'id,order_number,status,total,placed_at']);
});
it('rejects unbounded search and invalid status filters', async () => {
  expect((await request('get', '/orders', { search: 'a'.repeat(81) })).error).toMatchObject({ status: 400 });
  expect((await request('get', '/orders', { status: 'unknown' })).error).toMatchObject({ status: 400 });
});

it('validates and scopes disappeared-order transition batches to the store', async () => {
  const id = '73000000-0000-0000-0000-000000000001';
  const { error } = await request('get', '/orders/transitions', { ids: `${id},${id}` });
  expect(error).toBeUndefined();
  expect(db.filters).toContainEqual(['eq', 'store_id', 'owned-store']);
  expect(db.filters).toContainEqual(['in', 'id', [id]]);
  expect((await request('get', '/orders/transitions', { ids: 'bad' })).error).toMatchObject({ status: 400 });
  expect((await request('get', '/orders/transitions', { ids: Array(101).fill(id).join(',') })).error).toMatchObject({ status: 400 });
});

it('rejects array filters and unsupported view/summary contracts', async () => {
  expect((await request('get', '/orders', { status: ['placed', 'cancelled'] })).error).toMatchObject({ status: 400 });
  expect((await request('get', '/orders', { view: 'unknown' })).error).toMatchObject({ status: 400 });
  expect((await request('get', '/orders', { view: 'queue', summary: '1' })).error).toMatchObject({ status: 400 });
});
it('coalesces simultaneous lightweight reads for the same store', async () => {
  await Promise.all([request('get', '/orders/updates'), request('get', '/orders/updates')]);
  expect(db.filters.filter(row => row[0] === 'from' && row[1] === 'orders')).toHaveLength(1);
});
