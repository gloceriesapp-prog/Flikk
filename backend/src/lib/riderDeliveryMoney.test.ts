import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

// Chainable PostgREST stand-in: every filter is recorded, the awaited result
// comes from db.tables[table].
const db = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  filters: [] as [string, string, unknown][],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder: Record<string, unknown> = {};
    const chain = (name: string) => (column: string, value: unknown) => { db.filters.push([table, `${name}:${column}`, value]); return builder; };
    for (const name of ['eq', 'in', 'is', 'or', 'gte', 'lt']) builder[name] = chain(name);
    builder.select = () => builder;
    builder.order = () => builder;
    builder.limit = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: db.tables[table] ?? [], error: null });
    return builder;
  },
} }));
vi.mock('./deliverySettings.js', () => ({ getRiderPaySettings: async () => ({ riderBasePayout: 30, riderExtraStopPayout: 10, extraStopFee: 15 }) }));
import { deliveryMoney } from './riderDeliveryMoney.js';
import { riderRouter } from '../routes/rider.js';

const settings = { riderBasePayout: 30, riderExtraStopPayout: 10, extraStopFee: 15 };

describe('deliveryMoney', () => {
  it('asks a COD rider to collect the order total and pays the minimum on free delivery', () => {
    expect(deliveryMoney({ id: 'o', trip_id: null, payment_method: 'cod', total: '212.5', delivery_fee: '0' }, [], settings))
      .toEqual({ payment_method: 'cod', cash_to_collect: 212.5, rider_payout: 30, rider_payout_base: 30, rider_payout_extra_stop: 0 });
  });
  it('collects nothing on a prepaid order', () => {
    expect(deliveryMoney({ id: 'o', trip_id: null, payment_method: 'online', total: 500, delivery_fee: 40 }, [], settings))
      .toMatchObject({ payment_method: 'online', cash_to_collect: 0, rider_payout: 40 });
  });
  it('collects the trip total less cancelled legs and pays per extra shop', () => {
    const legs = [
      { trip_id: 't', store_id: 'a', status: 'out_for_delivery', total: 100 },
      { trip_id: 't', store_id: 'b', status: 'out_for_delivery', total: 100 },
      { trip_id: 't', store_id: 'c', status: 'cancelled', total: 80 },
      { trip_id: 'other', store_id: 'd', status: 'cancelled', total: 999 },
    ];
    expect(deliveryMoney({ id: 'o', trip_id: 't', payment_method: 'cod', trips: { delivery_fee: 0, total: 300 } }, legs, settings))
      .toEqual({ payment_method: 'cod', cash_to_collect: 220, rider_payout: 40, rider_payout_base: 30, rider_payout_extra_stop: 10 });
  });
  it('reports the recorded earning once the delivery is paid', () => {
    expect(deliveryMoney({ id: 'o', trip_id: null, payment_method: 'cod', total: 100, delivery_fee: 0 }, [], settings,
      { amount: '25', base_amount: '25', extra_stop_amount: '0' })).toMatchObject({ rider_payout: 25, rider_payout_base: 25 });
  });
});

function handler(path: string): RequestHandler {
  return riderRouter.stack.find((l) => l.route?.path === path && (l.route as unknown as { methods: Record<string, boolean> }).methods.get)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function get(path: string, query: Record<string, string> = {}) {
  const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(path)({ user: { id: 'rider-1' }, params: {}, query } as unknown as Request, res, next);
  return { body: (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0], err: next.mock.calls[0]?.[0] };
}

beforeEach(() => { db.tables = {}; db.filters = []; });

describe('GET /rider/assignments money fields', () => {
  it('adds payment method, cash to collect and the rider payout to each assignment', async () => {
    db.tables.orders = [
      { id: 'o1', trip_id: null, status: 'packed', placed_at: '2026-10-07T10:00:00Z', payment_method: 'cod', total: 150, delivery_fee: 0,
        users: { name: 'Asha', phone: '+919000000001' }, addresses: { line1: '1 Road', delivery_instructions: 'Ring twice' } },
    ];
    const { body, err } = await get('/assignments', { view: 'sync', page: '1', limit: '100' });
    expect(err).toBeUndefined();
    expect(body.items[0]).toMatchObject({ id: 'o1', payment_method: 'cod', cash_to_collect: 150, rider_payout: 30,
      users: { name: 'Asha', phone: '+919000000001' }, addresses: { delivery_instructions: 'Ring twice' } });
    expect(db.filters).toContainEqual(['orders', 'eq:rider_id', 'rider-1']);
    expect(db.filters).toContainEqual(['rider_earnings', 'eq:rider_id', 'rider-1']);
  });
});

describe('GET /rider/cash-balance', () => {
  it('sums only the caller\'s unsettled cash', async () => {
    db.tables.rider_cash_collections = [{ amount: '150.50' }, { amount: 49.5 }];
    const { body, err } = await get('/cash-balance');
    expect(err).toBeUndefined();
    expect(body).toEqual({ outstanding: 200, count: 2 });
    expect(db.filters).toEqual([['rider_cash_collections', 'eq:rider_id', 'rider-1'], ['rider_cash_collections', 'is:settled_at', null]]);
  });
});
