import { beforeEach, expect, it, vi } from 'vitest';

// Mirrors partnerSuspension.test.ts: exercises requireActiveRider against a
// mocked riders lookup. riderSuspension selects is_active + suspended_reason.
const db = vi.hoisted(() => ({
  rows: {} as Record<string, { is_active: boolean; suspended_reason: string | null }>,
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
import { requireActiveRider, type AuthedRequest } from './auth.js';

async function run(user: AuthedRequest['user']) {
  const next = vi.fn();
  await requireActiveRider({ user } as AuthedRequest, {} as never, next);
  return next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined;
}

beforeEach(() => { db.rows = {}; db.error = null; db.lookups = 0; });

it('lets an active rider through', async () => {
  db.rows['rider-active'] = { is_active: true, suspended_reason: null };
  expect(await run({ id: 'rider-active', role: 'rider', isApproved: true })).toBeUndefined();
});

it('refuses a suspended rider with the admin reason', async () => {
  db.rows['rider-suspended'] = { is_active: false, suspended_reason: 'Repeated no-shows' };
  const err = await run({ id: 'rider-suspended', role: 'rider', isApproved: true });
  expect(err).toMatchObject({ status: 403, code: 'RIDER_SUSPENDED' });
  expect(err?.message).toContain('Repeated no-shows');
});

it('never looks up customers, store owners or admins', async () => {
  for (const role of ['customer', 'store_owner', 'admin'] as const) {
    expect(await run({ id: `u-${role}`, role, isApproved: true })).toBeUndefined();
  }
  expect(db.lookups).toBe(0);
});

it('treats a rider without a profile row as not suspended', async () => {
  expect(await run({ id: 'rider-no-profile', role: 'rider', isApproved: true })).toBeUndefined();
});

it('treats a database without migration 110 as nobody suspended', async () => {
  db.error = { code: '42703' };
  expect(await run({ id: 'rider-premigration', role: 'rider', isApproved: true })).toBeUndefined();
});

it('fails closed when the lookup errors', async () => {
  db.error = { code: 'XX000' };
  expect(await run({ id: 'rider-dberror', role: 'rider', isApproved: true })).toMatchObject({ status: 503 });
});
