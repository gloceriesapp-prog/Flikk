import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestHandler, Response, Router } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';

const mocks = vi.hoisted(() => ({
  legRoute: vi.fn(),
  rows: new Map<string, Record<string, unknown>[]>(),
  selects: [] as { table: string; select: string }[],
  errors: new Map<string, { message: string }>(),
}));
vi.mock('./legRoutes.js', () => ({ legRoute: mocks.legRoute }));
vi.mock('../middleware/auth.js', () => ({ requireAuth: vi.fn(), requireRole: () => vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: (table: string) => {
  const filters: [string, unknown][] = [];
  const data = () => (mocks.rows.get(table) ?? []).filter(row => filters.every(([key, value]) => row[key] === value));
  const result = () => mocks.errors.has(table) ? { data: null, error: mocks.errors.get(table) } : null;
  const builder = {
    select: (select: string) => { mocks.selects.push({ table, select }); return builder; },
    eq: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
    maybeSingle: async () => result() ?? { data: data()[0] ?? null, error: null },
    order: async () => result() ?? { data: data(), error: null },
  };
  return builder;
} } }));

import { riderLocationOrdersRouter, riderLocationTripsRouter, riderLocationView, destinationOf, RIDER_LOCATION_STALE_SECONDS } from './riderLocation.js';

const ORDER = '11111111-1111-4111-8111-111111111111';
const TRIP = '22222222-2222-4222-8222-222222222222';
const NOW = Date.parse('2026-10-15T10:00:00.000Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
const snapshot = { line1: 'Flat 4', latitude: 12.97, longitude: 77.59 };

function handler(router: Router) {
  const layer = router.stack.find(l => l.route?.path === '/:id/rider-location');
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function call(router: Router, id: string, user = 'owner', query: Record<string, string> = {}) {
  const req = { params: { id }, query, user: { id: user, role: 'customer', isApproved: true } } as unknown as AuthedRequest;
  const res = { set: vi.fn(), json: vi.fn() } as unknown as Response & { set: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  const next = vi.fn();
  await handler(router)(req, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
}
function order(status: string, extra: Record<string, unknown> = {}) {
  mocks.rows.set('orders', [{ id: ORDER, customer_id: 'owner', status, rider_id: 'rider-1', picked_up_at: ago(600), delivery_address_at_order: snapshot, ...extra }]);
}
function rider(secondsAgo: number | null, extra: Record<string, unknown> = {}) {
  mocks.rows.set('riders', [{ user_id: 'rider-1', name: 'Ravi', phone: '9999999999', current_lat: 12.98, current_lng: 77.6,
    last_location_update: secondsAgo === null ? null : ago(secondsAgo), ...extra }]);
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  mocks.legRoute.mockReset();
  mocks.rows.clear(); mocks.selects.length = 0; mocks.errors.clear();
});
afterEach(() => { vi.useRealTimers(); });

describe('GET /orders/:id/rider-location', () => {
  it('returns the live position to the owning customer while out for delivery, uncached', async () => {
    order('out_for_delivery', { stores: { lat: '12.95', lng: '77.58' } }); rider(20);
    const { res, body, next } = await call(riderLocationOrdersRouter, ORDER);
    expect(next).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(body).toEqual({
      active: true,
      leg: 'drop',
      route_version: null,
      rider_location: { lat: 12.98, lng: 77.6, updated_at: ago(20), age_seconds: 20, stale: false },
      destination: { lat: 12.97, lng: 77.59 },
      pickup: { lat: 12.95, lng: 77.58 },
      stale_after_seconds: RIDER_LOCATION_STALE_SECONDS,
    });
  });

  it('uses the shared leg route: rider -> store before pickup, rider -> customer after', async () => {
    const store = { latitude: 12.95, longitude: 77.58 };
    const home = { latitude: 12.97, longitude: 77.59 };
    const riderAt = { latitude: 12.98, longitude: 77.6 };
    mocks.legRoute.mockResolvedValue({ leg: 'pickup', points: [riderAt, store], version: 2, distanceM: 900, durationS: 180 });
    const stores = { lat: store.latitude, lng: store.longitude };
    rider(20);

    // A rider heading to the store: their position and the pickup route.
    order('packed', { stores, picked_up_at: null });
    let { body } = await call(riderLocationOrdersRouter, ORDER, 'owner', { route: '1' });
    expect(mocks.legRoute).toHaveBeenLastCalledWith(ORDER, 'pickup', riderAt, store, { point: riderAt, at: ago(20) }, true);
    expect(body).toMatchObject({ active: true, leg: 'pickup', route_version: 2, route: [riderAt, store], rider_location: { lat: 12.98 } });

    // The light poll checks the route (version) without asking for points.
    ({ body } = await call(riderLocationOrdersRouter, ORDER));
    expect(mocks.legRoute).toHaveBeenLastCalledWith(ORDER, 'pickup', riderAt, store, { point: riderAt, at: ago(20) }, false);
    expect(body).not.toHaveProperty('route');

    // After pickup: the drop leg, from the rider to the customer.
    order('out_for_delivery', { stores });
    await call(riderLocationOrdersRouter, ORDER, 'owner', { route: '1' });
    expect(mocks.legRoute).toHaveBeenLastCalledWith(ORDER, 'drop', riderAt, home, { point: riderAt, at: ago(20) }, true);

    // Another customer never reaches the route.
    mocks.legRoute.mockClear();
    await call(riderLocationOrdersRouter, ORDER, 'another-customer', { route: '1' });
    expect(mocks.legRoute).not.toHaveBeenCalled();
  });

  it('drops from the store when the rider GPS is stale, with no fix to judge the road by', async () => {
    order('out_for_delivery', { stores: { lat: 12.95, lng: 77.58 } });
    rider(RIDER_LOCATION_STALE_SECONDS + 1);
    await call(riderLocationOrdersRouter, ORDER, 'owner', { route: '1' });
    expect(mocks.legRoute).toHaveBeenLastCalledWith(ORDER, 'drop', { latitude: 12.95, longitude: 77.58 }, { latitude: 12.97, longitude: 77.59 }, null, true);
  });

  it('never exposes rider identity or contact details', async () => {
    order('out_for_delivery'); rider(5);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    const text = JSON.stringify(body);
    expect(text).not.toContain('Ravi'); expect(text).not.toContain('9999999999'); expect(text).not.toContain('rider-1');
    const riderSelect = mocks.selects.find(s => s.table === 'riders')!.select;
    expect(riderSelect).toBe('current_lat,current_lng,last_location_update');
    expect(mocks.selects.every(s => !s.select.includes('*'))).toBe(true);
  });

  it('404s for another customer without reading the rider', async () => {
    order('out_for_delivery'); rider(5);
    const { next, res } = await call(riderLocationOrdersRouter, ORDER, 'someone-else');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404, code: 'ORDER_NOT_FOUND' }));
    expect(res.json).not.toHaveBeenCalled();
    expect(mocks.selects.some(s => s.table === 'riders')).toBe(false);
  });

  it('404s a malformed id without querying', async () => {
    const { next } = await call(riderLocationOrdersRouter, 'not-a-uuid');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
    expect(mocks.selects).toHaveLength(0);
  });

  it.each(['placed', 'packed'])('returns only the pins before a rider is assigned (%s)', async status => {
    order(status, { picked_up_at: null, rider_id: null, stores: { lat: 12.95, lng: 77.58 } }); rider(5);
    const { body } = await call(riderLocationOrdersRouter, ORDER, 'owner', { route: '1' });
    expect(body).toEqual({
      active: false, rider_location: null,
      pickup: { lat: 12.95, lng: 77.58 }, destination: { lat: 12.97, lng: 77.59 },
      stale_after_seconds: RIDER_LOCATION_STALE_SECONDS,
    });
    expect(mocks.selects.some(s => s.table === 'riders')).toBe(false);
    expect(mocks.legRoute).not.toHaveBeenCalled();
  });

  it.each(['delivered', 'failed', 'cancelled'])('returns null once the order is %s', async status => {
    order(status); rider(5);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body).toMatchObject({ active: false, rider_location: null });
    expect(mocks.selects.some(s => s.table === 'riders')).toBe(false);
  });

  it('flags positions older than the staleness window as stale', async () => {
    order('out_for_delivery'); rider(RIDER_LOCATION_STALE_SECONDS + 1);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body.rider_location).toMatchObject({ stale: true, age_seconds: RIDER_LOCATION_STALE_SECONDS + 1 });
  });

  it('treats a position exactly at the window edge as fresh', async () => {
    order('out_for_delivery'); rider(RIDER_LOCATION_STALE_SECONDS);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body.rider_location.stale).toBe(false);
  });

  it('withholds a ping taken before pickup', async () => {
    order('out_for_delivery', { picked_up_at: ago(30) }); rider(31);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body).toMatchObject({ active: true, rider_location: null, destination: { lat: 12.97, lng: 77.59 } });
  });

  it('returns no position when the rider has never pinged', async () => {
    order('out_for_delivery'); rider(null);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body).toMatchObject({ active: true, rider_location: null });
  });

  it('falls back to the joined address for orders without a coordinate snapshot', async () => {
    order('out_for_delivery', { delivery_address_at_order: { line1: 'old' }, addresses: { latitude: '12.5', longitude: '77.5' } }); rider(5);
    const { body } = await call(riderLocationOrdersRouter, ORDER);
    expect(body.destination).toEqual({ lat: 12.5, lng: 77.5 });
    expect(body.pickup).toBeNull();
  });

  it('surfaces a database failure as 503 rather than "not found"', async () => {
    mocks.errors.set('orders', { message: 'boom' });
    const { next } = await call(riderLocationOrdersRouter, ORDER);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 503, code: 'TRACKING_UNAVAILABLE' }));
  });
});

describe('GET /trips/:id/rider-location', () => {
  beforeEach(() => {
    mocks.rows.set('trips', [{ id: TRIP, customer_id: 'owner', delivery_address_at_order: snapshot }]);
  });
  const legs = (...rows: Record<string, unknown>[]) => mocks.rows.set('orders', rows.map((r, i) => ({ id: `leg-${i}`, trip_id: TRIP, customer_id: 'owner', rider_id: 'rider-1', picked_up_at: ago(300), ...r })));

  it('returns the rider position when the last pickup is complete', async () => {
    legs(
      { status: 'out_for_delivery', stores: { lat: 12.95, lng: 77.58 } },
      { status: 'out_for_delivery', picked_up_at: ago(400), stores: { lat: 12.93, lng: 77.57 } },
    );
    rider(10);
    const { body, res } = await call(riderLocationTripsRouter, TRIP);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(body).toMatchObject({
      active: true,
      rider_location: { lat: 12.98, lng: 77.6, stale: false },
      destination: { lat: 12.97, lng: 77.59 },
      pickup: { lat: 12.95, lng: 77.58 },
    });
  });

  it('404s another customer before reading legs or riders', async () => {
    legs({ status: 'out_for_delivery' }); rider(10);
    const { next } = await call(riderLocationTripsRouter, TRIP, 'someone-else');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404, code: 'TRIP_NOT_FOUND' }));
    expect(mocks.selects.map(s => s.table)).toEqual(['trips']);
  });

  it('shows the rider heading to the next store, pins only without a rider, and clears after delivery', async () => {
    legs(
      { status: 'out_for_delivery' },
      { status: 'packed', picked_up_at: null, stores: { lat: 12.93, lng: 77.57 } },
    );
    rider(10);
    const { body } = await call(riderLocationTripsRouter, TRIP, 'owner', { route: '1' });
    expect(body).toMatchObject({ active: true, leg: 'pickup', pickup: { lat: 12.93, lng: 77.57 }, rider_location: { lat: 12.98 } });
    expect(mocks.legRoute).toHaveBeenLastCalledWith('leg-1', 'pickup', { latitude: 12.98, longitude: 77.6 }, { latitude: 12.93, longitude: 77.57 }, expect.anything(), true);

    legs({ status: 'packed', picked_up_at: null, rider_id: null, stores: { lat: 12.93, lng: 77.57 } });
    expect((await call(riderLocationTripsRouter, TRIP)).body).toMatchObject({ active: false, rider_location: null, pickup: { lat: 12.93, lng: 77.57 } });
    mocks.selects.length = 0;
    legs({ status: 'delivered' }, { status: 'delivered' });
    expect((await call(riderLocationTripsRouter, TRIP)).body).toMatchObject({ active: false, rider_location: null });
    expect(mocks.selects.some(s => s.table === 'riders')).toBe(false);
  });

  it('ignores legs belonging to a different customer', async () => {
    legs({ status: 'out_for_delivery', customer_id: 'someone-else' }); rider(10);
    expect((await call(riderLocationTripsRouter, TRIP)).body).toMatchObject({ active: false, rider_location: null });
  });
});

describe('riderLocationView / destinationOf', () => {
  it('rejects unusable coordinates', () => {
    const row = (lat: unknown, lng: unknown) => ({ current_lat: lat, current_lng: lng, last_location_update: ago(1) });
    expect(riderLocationView(row(null, 77), null, NOW)).toBeNull();
    expect(riderLocationView(row(0, 0), null, NOW)).toBeNull();
    expect(riderLocationView(row(91, 77), null, NOW)).toBeNull();
    expect(riderLocationView(row('12.9', '77.6'), null, NOW)).toMatchObject({ lat: 12.9, lng: 77.6 });
  });
  it('never reports a negative age under clock drift', () => {
    expect(riderLocationView({ current_lat: 12, current_lng: 77, last_location_update: new Date(NOW + 5000).toISOString() }, null, NOW))
      .toMatchObject({ age_seconds: 0, stale: false });
  });
  it('returns null destination when no coordinates are known', () => {
    expect(destinationOf({ delivery_address_at_order: { line1: 'x' }, addresses: null })).toBeNull();
    expect(destinationOf({ addresses: [{ latitude: 1, longitude: 2 }] })).toEqual({ lat: 1, lng: 2 });
  });
});
