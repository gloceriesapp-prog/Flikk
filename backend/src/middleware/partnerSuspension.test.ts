import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  rows: {} as Record<string, { partner_suspended: boolean; partner_suspended_reason: string | null; store_memberships?: unknown }>,
  error: null as { code: string } | null,
  lookups: 0,
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => {
    let id = '';
    const builder = {
      select: () => builder,
      eq: (_column: string, value: string) => { id = value; return builder; },
      maybeSingle: () => { db.lookups += 1; return Promise.resolve(db.error ? { data: null, error: db.error } : { data: db.rows[id] ?? null, error: null }); },
    };
    return builder;
  },
} }));
import { requireActivePartner, type AuthedRequest } from './auth.js';

async function run(user: AuthedRequest['user']) {
  const next = vi.fn();
  await requireActivePartner({ user } as AuthedRequest, {} as never, next);
  return next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined;
}

beforeEach(() => { db.rows = {}; db.error = null; db.lookups = 0; });

it('lets an active partner through', async () => {
  db.rows['owner-active'] = { partner_suspended: false, partner_suspended_reason: null };
  expect(await run({ id: 'owner-active', role: 'store_owner', isApproved: true })).toBeUndefined();
});

it('refuses a suspended partner with the admin reason', async () => {
  db.rows['owner-suspended'] = { partner_suspended: true, partner_suspended_reason: 'Repeated cancellations' };
  const err = await run({ id: 'owner-suspended', role: 'store_owner', isApproved: true });
  expect(err).toMatchObject({ status: 403, code: 'PARTNER_SUSPENDED' });
  expect(err?.message).toContain('Repeated cancellations');
});

it('never looks up customers, riders or admins', async () => {
  for (const role of ['customer', 'rider', 'admin'] as const) {
    expect(await run({ id: `u-${role}`, role, isApproved: true })).toBeUndefined();
  }
  expect(db.lookups).toBe(0);
});

it('treats a database without migration 114 as nobody suspended', async () => {
  db.error = { code: '42703' };
  expect(await run({ id: 'owner-premigration', role: 'store_owner', isApproved: true })).toBeUndefined();
});

it('fails closed when the lookup errors', async () => {
  db.error = { code: 'XX000' };
  expect(await run({ id: 'owner-dberror', role: 'store_owner', isApproved: true })).toMatchObject({ status: 503 });
});

it('inherits the primary owner suspension for a store manager', async () => {
  db.rows['manager-owner-suspended'] = { partner_suspended:false,partner_suspended_reason:null,
    store_memberships:[{is_active:true,stores:{owner:{partner_suspended:true,partner_suspended_reason:'Owner policy breach'}}}] };
  expect(await run({id:'manager-owner-suspended',role:'store_owner',isApproved:true})).toMatchObject({code:'PARTNER_SUSPENDED',status:403});
});
it('fails closed if an active membership has no verified owner', async () => {
  db.rows['manager-owner-missing'] = {partner_suspended:false,partner_suspended_reason:null,store_memberships:[{is_active:true,stores:null}]};
  expect(await run({id:'manager-owner-missing',role:'store_owner',isApproved:true})).toMatchObject({status:503});
});
