import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response, Router } from 'express';

const db = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  placedSiblings: [] as { id: string }[],
  updateResult: { data: null as unknown, error: null as unknown },
  rpc: vi.fn(),
  updates: [] as unknown[],
  verifyDelivery: vi.fn(),
  notifyStores: vi.fn(),
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: db.rpc,
  from: () => {
    let mode: 'read' | 'siblings' | 'update' = 'read';
    const builder = {
      select: (cols?: string) => { if (mode !== 'update' && cols === 'id') mode = 'siblings'; return builder; },
      update: (patch: unknown) => { mode = 'update'; db.updates.push(patch); return builder; },
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      limit: () => Promise.resolve({ data: db.placedSiblings, error: null }),
      single: () => Promise.resolve({ data: db.order, error: db.order ? null : { code: 'PGRST116' } }),
      maybeSingle: () => Promise.resolve(mode === 'update' ? db.updateResult : { data: db.order, error: null }),
    };
    return builder;
  },
} }));
vi.mock('../orders/deliveryCodes.js', () => ({ customerDeliveryCodes: vi.fn(), completeDelivery: vi.fn(), verifyDelivery: db.verifyDelivery }));
vi.mock('../orders/deliveredPush.js', () => ({ notifyStoresOfDelivery: db.notifyStores }));
vi.mock('../lib/riderDispatch.js', () => ({ triggerDispatch: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../lib/pushNotifications.js', () => ({ sendPushNotification: vi.fn(), sendPushNotifications: vi.fn(), embeddedPushToken: vi.fn() }));
vi.mock('../lib/notifications.js', () => ({ createNotification: vi.fn() }));
import { ordersRouter } from './orders.js';
import { adminRouter } from './admin.js';

function handler(router: Router, path: string): RequestHandler {
  return router.stack.find(l => l.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function call(router: Router, path: string, req: Partial<Request>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(router, path)(req as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}
const rider = { id: 'rider-1', role: 'rider' };
const leg = { id: 'leg-a', status: 'packed', store_id: 'store-a', rider_id: 'rider-1', customer_id: 'c1', trip_id: 'trip-1', payment_method: 'cod', provider_payment_id: null };
const patchStatus = (body: Record<string, unknown>) =>
  call(ordersRouter, '/:id/status', { params: { id: 'leg-a' }, body, user: rider } as unknown as Partial<Request>);

beforeEach(() => {
  vi.clearAllMocks();
  db.order = { ...leg };
  db.placedSiblings = [];
  db.updateResult = { data: { ...leg, status: 'out_for_delivery' }, error: null };
  db.updates = [];
});

it('refuses picking up a trip leg while another shop in the trip has not packed', async () => {
  db.placedSiblings = [{ id: 'leg-b' }];
  expect((await patchStatus({ status: 'out_for_delivery' })).err).toMatchObject({ status: 409, code: 'TRIP_NOT_READY' });
  expect(db.updates).toHaveLength(0);
});

it('maps the database pickup guard to the same 409', async () => {
  db.updateResult = { data: null, error: { code: 'P0409' } };
  expect((await patchStatus({ status: 'out_for_delivery' })).err).toMatchObject({ status: 409, code: 'TRIP_NOT_READY' });
});

it('picks up once every sibling has packed', async () => {
  const { err, res } = await patchStatus({ status: 'out_for_delivery' });
  expect(err).toBeUndefined();
  expect(db.updates).toHaveLength(1);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'out_for_delivery' }));
});

it('sends the earned pushes only from the call that actually delivered', async () => {
  db.order = { ...leg, status: 'out_for_delivery' };
  db.verifyDelivery.mockResolvedValue({ order: { ...leg, status: 'delivered' }, replayed: false });
  expect((await patchStatus({ status: 'delivered', otp: '1234' })).err).toBeUndefined();
  expect(db.notifyStores).toHaveBeenCalledWith(expect.objectContaining({ id: 'leg-a', trip_id: 'trip-1' }), expect.objectContaining({ status: 'delivered' }));
  db.notifyStores.mockClear();
  db.verifyDelivery.mockResolvedValue({ order: { ...leg, status: 'delivered' }, replayed: true });
  expect((await patchStatus({ status: 'delivered', otp: '1234' })).err).toBeUndefined();
  expect(db.notifyStores).not.toHaveBeenCalled();
});

it('admin cannot assign a single trip leg; the whole trip must be assigned', async () => {
  db.order = { trip_id: 'trip-1' };
  const { err } = await call(adminRouter, '/orders/:id/assign-rider', { params: { id: 'leg-a' }, body: { rider_id: 'rider-2' } } as unknown as Partial<Request>);
  expect(err).toMatchObject({ status: 409, code: 'TRIP_ASSIGNMENT_REQUIRED' });
  expect(db.updates).toHaveLength(0);
});

it('admin trip assignment goes through the locked RPC and refuses a trip owned by another rider', async () => {
  db.rpc.mockResolvedValue({ data: null, error: { code: 'P0409' } });
  const req = { params: { id: 'trip-1' }, body: { rider_id: 'rider-2' } } as unknown as Partial<Request>;
  expect((await call(adminRouter, '/trips/:id/assign-rider', req)).err).toMatchObject({ status: 409, code: 'TRIP_HAS_RIDER' });
  expect(db.rpc).toHaveBeenCalledWith('assign_trip_rider', { p_trip: 'trip-1', p_rider: 'rider-2' });
  db.rpc.mockResolvedValue({ data: [{ id: 'leg-a' }, { id: 'leg-b' }], error: null });
  const { err, res } = await call(adminRouter, '/trips/:id/assign-rider', req);
  expect(err).toBeUndefined();
  expect(res.json).toHaveBeenCalledWith([{ id: 'leg-a' }, { id: 'leg-b' }]);
});
