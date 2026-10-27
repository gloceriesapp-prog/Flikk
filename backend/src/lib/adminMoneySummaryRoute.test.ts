import { beforeEach, expect, it, vi } from 'vitest';

// Admin → Revenue money split (app/api/money-summary).
const db = vi.hoisted(() => ({ authorized: true, args: null as unknown, error: null as unknown, data: {} as unknown }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => db.authorized
  ? { actor: { id: 'admin', email: 'ops@example.com' }, denied: null }
  : { actor: null, denied: new Response(JSON.stringify({ error: 'Sign in to continue.' }), { status: 401 }) } }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
  rpc: async (_name: string, args: unknown) => { db.args = args; return { data: db.data, error: db.error }; },
} }));
import { GET } from '../../../apps/admin/src/app/api/money-summary/route';
import { moneyRangeStart, parseMoneyRange } from '../../../apps/admin/src/lib/moneySummary';

beforeEach(() => {
  db.authorized = true; db.args = null; db.error = null;
  db.data = {
    earned: { deliveries: 2, customerPaid: '390', itemSales: '300', commission: '9', platformFee: '20', deliveryFees: '75',
      riderPay: '65', deliveryMargin: '10', discounts: '5', storeShare: '291', net: '34' },
    stores: { owedTotal: 340, paid: 100, inPayouts: 50, notBatched: 190, outstanding: 240,
      rows: [{ storeId: 's1', name: 'Shop', periodSales: 200, periodCommission: 7, periodShare: 193, owedTotal: 193, paid: 100, inPayouts: 0, notBatched: 93, outstanding: 93 }] },
    riders: { owedTotal: 90, paid: 40, outstanding: 50 },
    cash: { withRiders: 135, collections: 1 },
  };
});

it('ranges start at midnight India time; weeks on Monday', () => {
  const now = new Date('2026-10-28T20:00:00Z'); // Thu 29 Oct, 01:30 IST
  expect(moneyRangeStart('today', now)?.toISOString()).toBe('2026-10-28T18:30:00.000Z');
  expect(moneyRangeStart('week', now)?.toISOString()).toBe('2026-10-25T18:30:00.000Z');
  expect(moneyRangeStart('month', now)?.toISOString()).toBe('2026-09-30T18:30:00.000Z');
  expect(moneyRangeStart('all', now)).toBeNull();
  expect(parseMoneyRange('bogus')).toBe('month');
});

it('returns the split as numbers, with the range passed to Postgres', async () => {
  const res = await GET(new Request('http://admin/api/money-summary?range=all'));
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(db.args).toEqual({ p_from: null, p_to: null });
  expect(body.earned.net).toBe(34);
  expect(body.earned.storeShare + body.earned.riderPay + body.earned.net).toBe(body.earned.customerPaid);
  expect(body.stores.rows[0]).toMatchObject({ name: 'Shop', outstanding: 93 });
  expect(body.cash.withRiders).toBe(135);
});

it('needs an admin and hides database errors', async () => {
  db.authorized = false;
  expect((await GET(new Request('http://admin/api/money-summary'))).status).toBe(401);
  db.authorized = true; db.error = { code: '42501', message: 'secret detail' };
  const res = await GET(new Request('http://admin/api/money-summary?range=week'));
  expect(res.status).toBe(500);
  expect(JSON.stringify(await res.json())).not.toContain('secret');
});
