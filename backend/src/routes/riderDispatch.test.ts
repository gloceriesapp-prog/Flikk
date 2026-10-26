import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  orders: [] as Record<string, unknown>[],
  cash: [] as Record<string, unknown>[],
  notify: vi.fn(),
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: db.rpc,
  from: (table: string) => {
    const rows = () => (table === 'rider_cash_collections' ? db.cash : db.orders);
    const builder = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      order: () => builder,
      in: () => Promise.resolve({ data: db.orders, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) => resolve({ data: rows(), error: null }),
    };
    return builder;
  },
} }));
vi.mock('../lib/notifications.js', () => ({ createNotification: db.notify }));
vi.mock('../lib/deliverySettings.js', () => ({ getRiderPaySettings: async () => ({ riderBasePayout: 30, riderExtraStopPayout: 10, extraStopFee: 15 }) }));
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

beforeEach(() => { vi.clearAllMocks(); db.orders = []; db.cash = []; });

it('lists offers from the server-side rider position, ignoring client position and radius', async () => {
  db.rpc.mockImplementation(async (name: string) => name === 'dispatch_config'
    ? { data: [{ steps: [2000, 4000], step_seconds: 30, max_trips: 2 }], error: null }
    : { data: [{ order_id: 'o1', distance_m: 1200 }], error: null });
  db.orders = [{ id: 'o1', order_number: 'FLK-1', trip_id: null, payment_method: 'cod', total: '150', delivery_fee: '0', addresses: { line1: 'Private house', landmark: 'Private gate', latitude: 13.223456, longitude: 74.744321 } }];
  const { res, err } = await call('/dispatch-offers', 'get', { query: { lat: '0', lng: '0', radius_m: '100000000' } });
  expect(err).toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('rider_dispatch_offers', { p_rider: 'rider-1' });
  // Free delivery still offers the admin minimum payout; COD shows the cash to collect.
  expect(res.json).toHaveBeenCalledWith([{ ...db.orders[0], addresses: { line1: 'Approximate delivery area', landmark: null, latitude: 13.22, longitude: 74.74 }, distance_m: 1200, cash_to_collect: 150,
    rider_payout: 30, rider_payout_base: 30, rider_payout_extra_stop: 0, offer_window_seconds: 30, cash_limit_blocked: false }]);
});

it('flags cash offers the rider cannot take until they hand over cash', async () => {
  db.rpc.mockImplementation(async (name: string) => name === 'dispatch_config'
    ? { data: [{ step_seconds: 30 }], error: null }
    : { data: [{ order_id: 'o1', distance_m: 500 }, { order_id: 'o2', distance_m: 900 }], error: null });
  db.orders = [
    { id: 'o1', trip_id: null, payment_method: 'cod', total: '400', delivery_fee: '0' },
    { id: 'o2', trip_id: null, payment_method: 'online', total: '400', delivery_fee: '0' },
  ];
  db.cash = [{ id: 'c1', amount: '1800' }];
  const { res } = await call('/dispatch-offers', 'get', {});
  const offers = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { id: string; cash_limit_blocked: boolean }[];
  expect(offers.map((o) => [o.id, o.cash_limit_blocked])).toEqual([['o1', true], ['o2', false]]);
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
  ['RIDER_AT_CAPACITY', 409],
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
