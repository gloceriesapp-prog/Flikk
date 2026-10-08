import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  updateError: null as { code: string; message: string } | null,
  updates: [] as Record<string, unknown>[],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve(table === 'users' ? { data: { phone: '+919999999999' }, error: null } : { data: db.store, error: null }),
      update: (patch: Record<string, unknown>) => {
        db.updates.push(patch);
        const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve(db.updateError ? { data: null, error: db.updateError } : { data: { ...db.store, ...patch }, error: null }) };
        return chain;
      },
    };
    return builder;
  },
} }));
import { partnerRouter } from './partner.js';

const handler = partnerRouter.stack.find(l => l.route?.path === '/store' && (l.route as unknown as { methods: Record<string, boolean> }).methods.patch)!.route!.stack.at(-1)!.handle as RequestHandler;
async function patchStore(body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'owner-1' }, body } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined };
}

beforeEach(() => {
  db.store = { id: 'store-1', is_active: false, admin_suspended: false, suspended_reason: null };
  db.updateError = null;
  db.updates = [];
});

it('lets the partner reopen a store that is only closed', async () => {
  const { err } = await patchStore({ is_active: true });
  expect(err).toBeUndefined();
  expect(db.updates[0]).toEqual({ is_active: true });
});

it('refuses to reopen an admin-suspended store and gives the reason', async () => {
  db.store = { ...db.store, admin_suspended: true, suspended_reason: 'Expired FSSAI licence' };
  const { err } = await patchStore({ is_active: true });
  expect(err).toMatchObject({ status: 409, code: 'STORE_SUSPENDED' });
  expect(err?.message).toContain('Expired FSSAI licence');
  expect(db.updates).toHaveLength(0);
});

it('still lets a suspended store edit other fields', async () => {
  db.store = { ...db.store, admin_suspended: true, suspended_reason: 'x' };
  const { err } = await patchStore({ name: 'New name' });
  expect(err).toBeUndefined();
});

it('maps the database suspension guard to STORE_SUSPENDED', async () => {
  db.updateError = { code: 'P0409', message: 'STORE_SUSPENDED' };
  const { err } = await patchStore({ is_active: true });
  expect(err).toMatchObject({ status: 409, code: 'STORE_SUSPENDED' });
});
