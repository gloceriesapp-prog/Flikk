import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestHandler, Response, Router } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), trips: [] as Record<string, unknown>[], inserts: [] as unknown[] }));
vi.mock('../middleware/auth.js', () => ({ requireAuth: vi.fn(), requireRole: () => vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const filters: [string, unknown][] = [];
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
      limit: () => builder,
      single: async () => ({ data: table === 'zones' ? { id: 'zone-1' } : null, error: null }),
      maybeSingle: async () => ({ data: table === 'trips' ? mocks.trips.find(row => filters.every(([k, v]) => row[k] === v)) ?? null : null, error: null }),
      insert: async (row: unknown) => { mocks.inserts.push(row); return { error: null }; },
    };
    return builder;
  },
} }));

import { addressesRouter } from './addresses.js';
import { reviewsRouter } from './reviews.js';
import { referralsRouter } from './referrals.js';

function handler(router: Router, method: string, path: string) {
  const layer = router.stack.find(l => l.route?.path === path && l.route.methods[method]);
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function call(router: Router, method: string, path: string, body: unknown, params: Record<string, string> = {}) {
  const req = { body, params, user: { id: 'customer-1', role: 'customer', isApproved: true } } as unknown as AuthedRequest;
  const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  const next = vi.fn();
  await handler(router, method, path)(req, res, next);
  return { res, next };
}
const ADDRESS_ID = '11111111-1111-4111-8111-111111111111';
const address = { label: 'Home', line1: '12 Beach Rd', recipient_name: 'Asha', recipient_phone: '98450 12345', latitude: 13.2, longitude: 74.7 };

beforeEach(() => { mocks.rpc.mockReset(); mocks.trips = []; mocks.inserts = []; });

it('edits an owned address with the same validation as create and a normalized Indian phone', async () => {
  mocks.rpc.mockResolvedValue({ data: { id: ADDRESS_ID }, error: null });
  const { res, next } = await call(addressesRouter, 'patch', '/:id', address, { id: ADDRESS_ID });
  expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ id: ADDRESS_ID });
  expect(mocks.rpc).toHaveBeenCalledWith('manage_customer_address', expect.objectContaining({
    p_customer: 'customer-1', p_action: 'update', p_id: ADDRESS_ID,
    p_data: expect.objectContaining({ recipient_phone: '+919845012345', zone_id: 'zone-1' }),
  }));
});

it('rejects invalid edits and reports another customer’s address as not found', async () => {
  for (const bad of [{ ...address, recipient_phone: '12345' }, { ...address, line1: ' ' }, { ...address, latitude: 91 }, { ...address, recipient_name: 7 }]) {
    const { next } = await call(addressesRouter, 'patch', '/:id', bad, { id: ADDRESS_ID });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  const { next } = await call(addressesRouter, 'patch', '/:id', address, { id: ADDRESS_ID });
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
});

it('creates an address as default in one atomic call', async () => {
  mocks.rpc.mockResolvedValue({ data: { id: ADDRESS_ID, is_default: true }, error: null });
  await call(addressesRouter, 'post', '/', { ...address, make_default: true });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith('manage_customer_address', expect.objectContaining({ p_action: 'create', p_data: expect.objectContaining({ make_default: true }) }));
});

// Trip ids fan out to each delivered leg (full coverage in reviews.test.ts);
// a trip with no delivered leg is refused before any review is written.
it('refuses to rate a trip id that has no delivered leg', async () => {
  const tripId = '22222222-2222-4222-8222-222222222222';
  mocks.trips = [{ id: tripId, customer_id: 'customer-1' }];
  const { next } = await call(reviewsRouter, 'post', '/', { order_id: tripId, rating: 5 });
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409, code: 'ORDER_NOT_DELIVERED' }));
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it('rejects non-string referral codes with a 400 instead of crashing', async () => {
  for (const code of [undefined, 42, { $ne: '' }, ['A'], '   ']) {
    const { next } = await call(referralsRouter, 'post', '/redeem', { code });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  }
  expect(mocks.inserts).toHaveLength(0);
});

it('queues an automatic refund for failed online-paid single orders only, idempotently', () => {
  const sql = readFileSync(new URL('../../migrations/098_address_edit_failed_order_refunds.sql', import.meta.url), 'utf8');
  const trigger = sql.slice(sql.indexOf('queue_cancelled_order_refund() RETURNS trigger'));
  expect(trigger).toMatch(/NEW\.trip_id IS NULL AND \(NEW\.status='cancelled' OR \(NEW\.status='failed' AND NEW\.payment_method='online'\)\)/);
  expect(trigger).toContain('NEW.razorpay_payment_id IS NOT NULL');
  expect(trigger).toContain('ON CONFLICT(order_id) DO NOTHING');
});
