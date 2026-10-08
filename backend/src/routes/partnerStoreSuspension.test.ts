import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  updateError: null as { code: string; message: string } | null,
  updates: [] as Record<string, unknown>[],
  pending: null as Record<string, unknown> | null,
  rpcs: [] as { fn: string; args: Record<string, unknown> }[],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const result = () => (table === 'users' ? { data: { phone: '+919999999999' }, error: null } : { data: db.store, error: null });
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      order: () => builder,
      limit: () => Promise.resolve({ data: db.pending ? [db.pending] : [], error: null }),
      maybeSingle: () => Promise.resolve({ data: db.pending, error: null }),
      single: () => Promise.resolve(result()),
      update: (patch: Record<string, unknown>) => {
        db.updates.push(patch);
        const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve(db.updateError ? { data: null, error: db.updateError } : { data: { id: 'store-1' }, error: null }) };
        return chain;
      },
    };
    return builder;
  },
  rpc: (fn: string, args: Record<string, unknown>) => {
    db.rpcs.push({ fn, args });
    db.pending = { id: 'req-1', status: 'pending', changes: args.p_changes, review_reason: null, created_at: 'now', reviewed_at: null };
    return Promise.resolve({ data: db.pending, error: null });
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
  db.store = { id: 'store-1', name: 'Old name', category: 'Kirana & Grocery', drug_license_number: null, is_active: false, admin_suspended: false, suspended_reason: null };
  db.updateError = null;
  db.updates = [];
  db.pending = null;
  db.rpcs = [];
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
  const { err } = await patchStore({ open_time: '08:00' });
  expect(err).toBeUndefined();
  expect(db.updates[0]).toEqual({ open_time: '08:00' });
});

it('maps the database suspension guard to STORE_SUSPENDED', async () => {
  db.updateError = { code: 'P0409', message: 'STORE_SUSPENDED' };
  const { err } = await patchStore({ is_active: true });
  expect(err).toMatchObject({ status: 409, code: 'STORE_SUSPENDED' });
});

// Store profile review (#37): identity / reach edits never write the live row.
it('files name, category and map pin as a change request and leaves the store unchanged', async () => {
  const { err, res } = await patchStore({ name: ' New name ', category: 'Bakery', lat: 13.3, lng: 74.8, address_line: 'New road', open_time: '07:00' });
  expect(err).toBeUndefined();
  expect(db.updates).toEqual([{ open_time: '07:00' }]);
  expect(db.rpcs).toEqual([{ fn: 'partner_request_store_profile_change', args: {
    p_store: 'store-1', p_user: 'owner-1', p_changes: { name: 'New name', category: 'Bakery', address_line: 'New road', lat: 13.3, lng: 74.8 },
  } }]);
  const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
  expect(body).toMatchObject({ name: 'Old name', pending_change: { status: 'pending' } });
});

it('rejects a category admin does not allow', async () => {
  const { err } = await patchStore({ category: 'Liquor' });
  expect(err).toMatchObject({ status: 400, code: 'INVALID_CATEGORY' });
  expect(db.rpcs).toHaveLength(0);
});

it('needs a drug licence to become a pharmacy', async () => {
  expect((await patchStore({ category: 'Pharmacy' })).err).toMatchObject({ status: 400, code: 'DRUG_LICENSE_REQUIRED' });
  const { err } = await patchStore({ category: 'Pharmacy', drug_license_number: 'KA-20B-77' });
  expect(err).toBeUndefined();
  expect(db.rpcs[0].args.p_changes).toEqual({ category: 'Pharmacy', drug_license_number: 'KA-20B-77' });
});

it('refuses a pin with only one coordinate', async () => {
  const { err } = await patchStore({ lat: 13.1 });
  expect(err).toMatchObject({ status: 400 });
  expect(db.rpcs).toHaveLength(0);
});
