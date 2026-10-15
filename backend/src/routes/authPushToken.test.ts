import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

type Update = { patch: Record<string, unknown>; filters: [string, string, unknown][] };
const db = vi.hoisted(() => ({ updates: [] as Update[], error: null as { code: string } | null }));

vi.mock('../db/supabase.js', () => ({
  supabaseAuth: { auth: {} },
  supabase: {
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        const entry: Update = { patch, filters: [] };
        db.updates.push(entry);
        const chain = {
          eq: (col: string, val: unknown) => { entry.filters.push(['eq', col, val]); return chain; },
          neq: (col: string, val: unknown) => { entry.filters.push(['neq', col, val]); return chain; },
          then: (resolve: (v: { error: unknown }) => unknown) => resolve({ error: db.error }),
        };
        return chain;
      },
    }),
  },
}));
vi.mock('../auth/loginOtp.js', () => ({ CODE_TTL_MINUTES: 10 }));
import { authRouter } from './auth.js';

function handler(method: 'post' | 'delete'): RequestHandler {
  const layer = authRouter.stack.find((l) => l.route?.path === '/push-token' && (l.route as unknown as { methods: Record<string, boolean> }).methods[method]);
  return layer!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function call(method: 'post' | 'delete', role: string, body: Record<string, unknown> = {}) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(method)({ user: { id: 'u1', role }, body } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}

beforeEach(() => { db.updates = []; db.error = null; });

it('moves a device token to the signing-in account and off every other account', async () => {
  const { res, err } = await call('post', 'rider', { token: 'ExponentPushToken[a]' });
  expect(err).toBeUndefined();
  expect(res.json).toHaveBeenCalledWith({ ok: true });
  expect(db.updates[0]).toEqual({ patch: { expo_push_token: null }, filters: [['eq', 'expo_push_token', 'ExponentPushToken[a]'], ['neq', 'id', 'u1']] });
  expect(db.updates[1]).toEqual({ patch: { expo_push_token: 'ExponentPushToken[a]' }, filters: [['eq', 'id', 'u1']] });
});

it('clears the token on sign-out, for riders and store owners', async () => {
  for (const role of ['rider', 'store_owner']) {
    db.updates = [];
    const { res, err } = await call('delete', role);
    expect(err).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(db.updates).toEqual([{ patch: { expo_push_token: null }, filters: [['eq', 'id', 'u1']] }]);
  }
});

it('keeps customers on their own device registration', async () => {
  expect((await call('delete', 'customer')).err).toMatchObject({ status: 400, code: 'USE_DEVICE_REGISTRATION' });
  expect(db.updates).toHaveLength(0);
});
