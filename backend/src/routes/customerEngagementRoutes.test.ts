import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const db = vi.hoisted(() => ({ rpc: vi.fn(), writes: [] as { table: string; row: Record<string, unknown> }[], failure: null as unknown }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: db.rpc,
  from: (table: string) => ({
    insert: async (row: Record<string, unknown>) => { db.writes.push({ table, row }); return { error: db.failure }; },
    upsert: async (row: Record<string, unknown>) => { db.writes.push({ table, row }); return { error: db.failure }; },
  }),
} }));
import { areaUpvotesRouter } from './areaUpvotes.js';
import { reviewsRouter } from './reviews.js';
const feedback = reviewsRouter.stack.find(layer => layer.route?.path === '/app')!.route!.stack.at(-1)!.handle as RequestHandler;
const subscribe = areaUpvotesRouter.stack.find(layer => layer.route?.path === '/subscribe')!.route!.stack.at(-1)!.handle as RequestHandler;
async function call(handler: RequestHandler, body: unknown) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ body, user: { id: 'trusted-customer' } } as unknown as Request, res, next);
  return { res, error: next.mock.calls[0]?.[0] as { code?: string } | undefined };
}
beforeEach(() => { vi.clearAllMocks(); db.writes = []; db.failure = null; db.rpc.mockResolvedValue({ error: null }); });
it.each([1, 2, 3, 4, 5])('retains app feedback at %i stars under the authenticated customer', async rating => {
  const result = await call(feedback, { rating, comment: '  Feedback  ', customer_id: 'spoofed' });
  expect(result.error).toBeUndefined();
  expect(db.writes[0]).toMatchObject({ table: 'customer_app_feedback', row: { customer_id: 'trusted-customer', rating, comment: 'Feedback' } });
  expect(result.res.status).toHaveBeenCalledWith(200);
});
it.each([0, 6, 2.5, '3', null])('rejects invalid feedback without persisting it: %s', async rating => {
  expect((await call(feedback, { rating })).error?.code).toBe('INVALID_FEEDBACK');
  expect(db.writes).toHaveLength(0);
});
it('reports persistence failures so the customer can retry instead of receiving false thanks', async () => {
  db.failure = new Error('write failed');
  expect((await call(feedback, { rating: 1 })).error).toBe(db.failure);
});
it('subscribes the verified identity, ignoring a client-supplied customer id', async () => {
  const result = await call(subscribe, { latitude: 12, longitude: 74, addressLabel: '  Area  ', customer_id: 'spoofed' });
  expect(result.error).toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('subscribe_area_waitlist', { p_customer: 'trusted-customer', p_lat: 12, p_lng: 74, p_address: 'Area' });
});
it.each([{ latitude: NaN, longitude: 74 }, { latitude: 91, longitude: 74 }, { latitude: 12, longitude: 181 }, { latitude: '12', longitude: 74 }])('rejects invalid waitlist coordinates %j', async coordinates => {
  expect((await call(subscribe, { ...coordinates, addressLabel: 'Area' })).error?.code).toBe('INVALID_WAITLIST');
  expect(db.rpc).not.toHaveBeenCalled();
});
