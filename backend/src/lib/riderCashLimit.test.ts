import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  rpcCalls: [] as string[],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const name of ['eq', 'in', 'is', 'or', 'select', 'order', 'limit']) builder[name] = () => builder;
    builder.maybeSingle = async () => ({ data: (db.tables[table] ?? [])[0] ?? null, error: null });
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: db.tables[table] ?? [], error: null });
    return builder;
  },
  rpc: async (name: string) => { db.rpcCalls.push(name); return { data: { accepted: true, replayed: true, order_id: 'o1' }, error: null }; },
} }));
vi.mock('./deliverySettings.js', () => ({ getRiderPaySettings: async () => ({ riderBasePayout: 30, riderExtraStopPayout: 10, extraStopFee: 15 }) }));
import { DEFAULT_RIDER_CASH_LIMIT, exceedsCashLimit, riderCashLimit } from './riderCashLimit.js';
import { riderRouter } from '../routes/rider.js';

describe('riderCashLimit', () => {
  it('defaults when unset or invalid, and 0 switches it off', () => {
    expect(riderCashLimit(undefined)).toBe(DEFAULT_RIDER_CASH_LIMIT);
    expect(riderCashLimit('')).toBe(DEFAULT_RIDER_CASH_LIMIT);
    expect(riderCashLimit('abc')).toBe(DEFAULT_RIDER_CASH_LIMIT);
    expect(riderCashLimit('-5')).toBe(DEFAULT_RIDER_CASH_LIMIT);
    expect(riderCashLimit('3500')).toBe(3500);
    expect(riderCashLimit('0')).toBe(0);
  });
});

describe('exceedsCashLimit', () => {
  it('blocks a cash order that would push held cash over the limit', () => {
    expect(exceedsCashLimit(1800, 300, 2000)).toBe(true);
    expect(exceedsCashLimit(1700, 300, 2000)).toBe(false);
  });
  it('never blocks prepaid orders, a rider holding nothing, or a disabled limit', () => {
    expect(exceedsCashLimit(5000, 0, 2000)).toBe(false);
    expect(exceedsCashLimit(0, 2500, 2000)).toBe(false);
    expect(exceedsCashLimit(5000, 300, 0)).toBe(false);
  });
});

function acceptHandler(): RequestHandler {
  const layer = riderRouter.stack.find((l) => l.route?.path === '/orders/:id/accept');
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function accept() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await acceptHandler()({ user: { id: 'rider-1' }, params: { id: 'o1' }, body: {} } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}

beforeEach(() => { db.tables = {}; db.rpcCalls = []; delete process.env.RIDER_CASH_LIMIT; });

describe('POST /rider/orders/:id/accept cash limit', () => {
  it('refuses a cash order over the limit before the atomic accept runs', async () => {
    db.tables.orders = [{ id: 'o1', trip_id: null, payment_method: 'cod', total: 400, delivery_fee: 0 }];
    db.tables.rider_cash_collections = [{ id: 'c1', amount: '1800' }];
    const { err } = await accept();
    expect(err).toMatchObject({ status: 409, code: 'CASH_LIMIT_REACHED' });
    expect(db.rpcCalls).not.toContain('accept_dispatch_offer');
  });
  it('lets a prepaid order through whatever cash is held', async () => {
    db.tables.orders = [{ id: 'o1', trip_id: null, payment_method: 'online', total: 400, delivery_fee: 0 }];
    db.tables.rider_cash_collections = [{ id: 'c1', amount: '9000' }];
    const { err, res } = await accept();
    expect(err).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith({ ok: true, orderId: 'o1' });
  });
  it('skips the check entirely when the limit is off', async () => {
    process.env.RIDER_CASH_LIMIT = '0';
    db.tables.orders = [{ id: 'o1', trip_id: null, payment_method: 'cod', total: 400, delivery_fee: 0 }];
    db.tables.rider_cash_collections = [{ id: 'c1', amount: '9000' }];
    expect((await accept()).err).toBeUndefined();
  });
});
