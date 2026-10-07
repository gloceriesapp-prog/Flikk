import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const TRIP = '11111111-1111-1111-1111-111111111111';
const LEG_A = '22222222-2222-2222-2222-222222222222';
const LEG_B = '33333333-3333-3333-3333-333333333333';
const db = vi.hoisted(() => ({
  trip: null as { id: string } | null,
  legs: [] as { id: string; status: string }[],
  rpcErrors: {} as Record<string, { code: string }>,
  rpcCalls: [] as Record<string, unknown>[],
  filters: [] as unknown[][],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => { db.filters.push([table, k, v]); return builder; },
      maybeSingle: () => Promise.resolve({ data: table === 'trips' ? db.trip : null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: db.legs, error: null }).then(resolve),
    };
    return builder;
  },
  rpc: (_name: string, args: Record<string, unknown>) => {
    db.rpcCalls.push(args);
    const error = db.rpcErrors[args.p_order as string];
    return Promise.resolve(error ? { data: null, error } : { data: { id: `r-${args.p_order}`, order_id: args.p_order }, error: null });
  },
} }));
import { reviewsRouter } from './reviews.js';

const post = reviewsRouter.stack.find(l => l.route?.path === '/' && l.route.methods.post)!.route!.stack.at(-1)!.handle as RequestHandler;
async function submit(order_id: string, rating = 4) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await post({ body: { order_id, rating }, user: { id: 'cust-1' } } as unknown as Request, res, next);
  return { res, next, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}

beforeEach(() => { db.trip = null; db.legs = []; db.rpcErrors = {}; db.rpcCalls = []; db.filters = []; });

it('rates every delivered leg of an owned trip instead of failing with not-found', async () => {
  db.trip = { id: TRIP };
  db.legs = [{ id: LEG_A, status: 'delivered' }, { id: LEG_B, status: 'delivered' }, { id: 'x', status: 'failed' }];
  const { res, err } = await submit(TRIP);
  expect(err).toBeUndefined();
  expect(db.rpcCalls.map(c => c.p_order)).toEqual([LEG_A, LEG_B]);
  expect(db.rpcCalls.every(c => c.p_customer === 'cust-1' && c.p_rating === 4)).toBe(true);
  expect(db.filters).toContainEqual(['trips', 'customer_id', 'cust-1']);
  expect(db.filters).toContainEqual(['orders', 'customer_id', 'cust-1']);
  expect(res.status).toHaveBeenCalledWith(201);
});

it('is idempotent for a trip: already-rated legs are skipped, all-rated is 409', async () => {
  db.trip = { id: TRIP };
  db.legs = [{ id: LEG_A, status: 'delivered' }, { id: LEG_B, status: 'delivered' }];
  db.rpcErrors = { [LEG_A]: { code: '23505' } };
  expect((await submit(TRIP)).err).toBeUndefined();
  db.rpcErrors[LEG_B] = { code: '23505' };
  expect((await submit(TRIP)).err).toMatchObject({ status: 409, code: 'ALREADY_REVIEWED' });
});

it('refuses a trip with no delivered leg', async () => {
  db.trip = { id: TRIP };
  db.legs = [{ id: LEG_A, status: 'out_for_delivery' }];
  expect((await submit(TRIP)).err).toMatchObject({ status: 409, code: 'ORDER_NOT_DELIVERED' });
  expect(db.rpcCalls).toHaveLength(0);
});

it('rates a single order directly and maps ownership failures to 404', async () => {
  expect((await submit(LEG_A)).err).toBeUndefined();
  db.rpcErrors = { [LEG_B]: { code: 'P0002' } };
  expect((await submit(LEG_B)).err).toMatchObject({ status: 404, code: 'ORDER_NOT_FOUND' });
});
