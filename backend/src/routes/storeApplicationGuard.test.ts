import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({ ownedStores: 0, upserts: [] as Record<string, unknown>[] }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => (table === 'stores' ? Promise.resolve({ count: db.ownedStores, error: null }) : builder),
      upsert: (row: Record<string, unknown>) => { db.upserts.push(row); return Promise.resolve({ error: null }); },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    return builder;
  },
} }));
import { storeOnboardingRouter } from './storeOnboarding.js';

const handler = storeOnboardingRouter.stack.find(l => l.route?.path === '/store-application')!.route!.stack.at(-1)!.handle as RequestHandler;
async function submit(extra: Record<string, unknown> = {}) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'owner-1' }, body: { storeName: 'Shop', category: 'Kirana & Grocery', district: 'Udupi', panNumber: 'ABCDE1234F', ...extra } } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined };
}

beforeEach(() => { db.ownedStores = 0; db.upserts = []; });

it('accepts an application from someone without a store', async () => {
  const { res, err } = await submit();
  expect(err).toBeUndefined();
  expect(res.status).toHaveBeenCalledWith(201);
  expect(db.upserts).toHaveLength(1);
});

it('refuses a second application from an owner who already has a store', async () => {
  db.ownedStores = 1;
  const { err } = await submit();
  expect(err).toMatchObject({ status: 409, code: 'STORE_ALREADY_EXISTS' });
  expect(db.upserts).toHaveLength(0);
});

it('refuses a category admin does not allow', async () => {
  const { err } = await submit({ category: 'Liquor store' });
  expect(err).toMatchObject({ status: 400, code: 'INVALID_CATEGORY' });
  expect(db.upserts).toHaveLength(0);
});

it('refuses a pharmacy without a drug licence and stores one that has it', async () => {
  expect((await submit({ category: 'Pharmacy' })).err).toMatchObject({ status: 400, code: 'DRUG_LICENSE_REQUIRED' });
  const { err } = await submit({ category: 'Pharmacy', drugLicenseNumber: ' KA-20B-1 ' });
  expect(err).toBeUndefined();
  expect(db.upserts[0]).toMatchObject({ category: 'Pharmacy', drug_license_number: 'KA-20B-1' });
});
