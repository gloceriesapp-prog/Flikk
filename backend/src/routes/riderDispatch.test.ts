import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  orders: [] as Record<string, unknown>[],
  notify: vi.fn(),
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: db.rpc,
  from: () => {
    const builder = {
      select: () => builder,
      in: () => Promise.resolve({ data: db.orders, error: null }),
    };
    return builder;
  },
} }));
vi.mock('../lib/notifications.js', () => ({ createNotification: db.notify }));
import { riderRouter } from './rider.js';

function handler(path: string, method: 'get' | 'post'): RequestHandler {
  return riderRouter.stack.find(l => l.route?.path === path && (l.route as unknown as { methods: Record<string, boolean> }).methods[method])!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function call(path: string, method: 'get' | 'post', req: Partial<Request>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(path, method)({ user: { id: 'rider-1' }, params: {}, query: {}, ...req } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}
const accept = (id = 'order-1') => call('/orders/:id/accept', 'post', { params: { id } });

beforeEach(() => { vi.clearAllMocks(); db.orders = []; });

it('lists offers from the server-side rider position, ignoring client position and radius', async () => {
  db.rpc.mockResolvedValue({ data: [{ order_id: 'o1', distance_m: 1200 }], error: null });
  db.orders = [{ id: 'o1', order_number: 'FLK-1' }];
  const { res, err } = await call('/dispatch-offers', 'get', { query: { lat: '0', lng: '0', radius_m: '100000000' } });
  expect(err).toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('rider_dispatch_offers', { p_rider: 'rider-1' });
  expect(res.json).toHaveBeenCalledWith([{ id: 'o1', order_number: 'FLK-1', distance_m: 1200 }]);
});

it('returns no offers (not 400) when the client sends no position', async () => {
  db.rpc.mockResolvedValue({ data: [], error: null });
  const { res, err } = await call('/dispatch-offers', 'get', {});
  expect(err).toBeUndefined();
  expect(res.json).toHaveBeenCalledWith([]);
});

it('accepts through the atomic trip-wide RPC and records the win once', async () => {
  db.rpc.mockResolvedValue({ data: { accepted: true, replayed: false, order_id: 'order-1', trip_id: 'trip-1' }, error: null });
  const { res, err } = await accept();
  expect(err).toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('accept_dispatch_offer', { p_order: 'order-1', p_rider: 'rider-1' });
  expect(res.json).toHaveBeenCalledWith({ ok: true, orderId: 'order-1' });
  expect(db.notify).toHaveBeenCalledTimes(1);
});

it('treats a repeat accept by the winner as a no-op success', async () => {
  db.rpc.mockResolvedValue({ data: { accepted: true, replayed: true, order_id: 'order-1' }, error: null });
  const { res, err } = await accept();
  expect(err).toBeUndefined();
  expect(res.json).toHaveBeenCalledWith({ ok: true, orderId: 'order-1' });
  expect(db.notify).not.toHaveBeenCalled();
});

it.each([
  ['ALREADY_TAKEN', 409],
  ['NOT_OFFERED', 409],
  ['RIDER_OFFLINE', 409],
  ['ORDER_NOT_FOUND', 404],
])('maps refused accept %s to %i without notifying', async (code, status) => {
  db.rpc.mockResolvedValue({ data: { accepted: false, error: code }, error: null });
  expect((await accept()).err).toMatchObject({ status, code });
  expect(db.notify).not.toHaveBeenCalled();
});

it('maps a malformed order id to 404 and surfaces other database errors', async () => {
  db.rpc.mockResolvedValue({ data: null, error: { code: '22P02' } });
  expect((await accept('nope')).err).toMatchObject({ status: 404, code: 'ORDER_NOT_FOUND' });
  db.rpc.mockResolvedValue({ data: null, error: { code: '08006' } });
  expect((await accept()).err).toMatchObject({ code: '08006' });
});
