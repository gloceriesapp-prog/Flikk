import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestHandler, Response, Router } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
const mocks = vi.hoisted(() => ({ rows: new Map<string, Record<string, unknown>[]>(), selects: [] as string[], eqs: [] as [string, unknown][], refund: vi.fn() }));
vi.mock('../orders/deliveryCodes.js', () => ({ customerDeliveryCodes: vi.fn(async () => new Map()) }));
vi.mock('../middleware/auth.js', () => ({ requireAuth: vi.fn(), requireRole: () => vi.fn() }));
vi.mock('../payments/tripRefunds.js', () => ({ tripRefundSummary: mocks.refund }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: (table: string) => {
  const filters: [string, unknown][] = [];
  const data = () => (mocks.rows.get(table) ?? []).filter(row => filters.every(([key, value]) => row[key] === value));
  const builder = { select: (selection: string) => { mocks.selects.push(selection); return builder; },
    eq: (key: string, value: unknown) => { filters.push([key, value]); mocks.eqs.push([key, value]); return builder; },
    maybeSingle: async () => ({ data: data()[0] ?? null, error: null }),
    order: async () => ({ data: data(), error: null }) };
  return builder;
} } }));
import { liveOrdersRouter, liveTripsRouter } from './live.js';
function handler(router: Router) {
  const layer = router.stack.find(layer => layer.route?.path === '/:id/live');
  return layer.route.stack.at(-1).handle as RequestHandler;
}
async function request(router: Router, id: string, user = 'owner') {
  const req = { params: { id }, user: { id: user, role: 'customer', isApproved: true } } as unknown as AuthedRequest;
  const res = { set: vi.fn(), json: vi.fn() } as unknown as Response; const next = vi.fn();
  await handler(router)(req, res, next); return { res, next };
}
beforeEach(() => { mocks.rows.clear(); mocks.selects.length = 0; mocks.eqs.length = 0; mocks.refund.mockResolvedValue(null); });
it('scopes a live order to its customer before returning any status or OTP', async () => {
  mocks.rows.set('orders', [{ id: 'order', customer_id: 'owner', status: 'packed' }]);
  const foreign = await request(liveOrdersRouter, 'order', 'other'); expect(foreign.next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  expect(foreign.res.json).not.toHaveBeenCalled(); expect(mocks.eqs).toContainEqual(['customer_id', 'other']);
  const own = await request(liveOrdersRouter, 'order'); expect(own.res.json).toHaveBeenCalled();
  expect(mocks.selects.every(select => !select.includes('*') && !select.includes('order_items') && !select.includes('addresses') && !select.includes('stores('))).toBe(true);
});
it('does not fetch trip legs or refund details for another customer', async () => {
  mocks.rows.set('trips', [{ id: 'trip', customer_id: 'owner' }]);
  const foreign = await request(liveTripsRouter, 'trip', 'other'); expect(foreign.next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.selects).toHaveLength(1);
});
it('returns a lightweight trip with customer-scoped leg statuses and refund progress', async () => {
  mocks.rows.set('trips', [{ id: 'trip', customer_id: 'owner', status: 'placed' }]);
  mocks.rows.set('orders', [{ id: 'leg', trip_id: 'trip', customer_id: 'owner', status: 'packed' }, { id: 'foreign-leg', trip_id: 'trip', customer_id: 'other' }]);
  const own = await request(liveTripsRouter, 'trip');
  expect(own.res.json).toHaveBeenCalledWith(expect.objectContaining({ orders: [expect.objectContaining({ id: 'leg' })], cancellation_refund: null }));
  expect(mocks.selects.join(' ')).not.toContain('order_items');
});
