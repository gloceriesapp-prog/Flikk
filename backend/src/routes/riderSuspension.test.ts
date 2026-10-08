import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const db = vi.hoisted(() => ({
  rider: null as Record<string, unknown> | null,
  updateError: null as { code: string } | null,
  updates: [] as Record<string, unknown>[],
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: db.rider, error: null }),
      update: (patch: Record<string, unknown>) => {
        db.updates.push(patch);
        return { eq: () => Promise.resolve({ error: db.updateError }) };
      },
    };
    return builder;
  },
} }));
vi.mock('../lib/notifications.js', () => ({ createNotification: vi.fn() }));
import { riderRouter } from './rider.js';

const handler = riderRouter.stack.find(l => l.route?.path === '/status')!.route!.stack.at(-1)!.handle as RequestHandler;
async function patchStatus(body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'rider-1' }, body } as unknown as Request, res, next);
  return { res, err: next.mock.calls[0]?.[0] as { status?: number; code?: string; message?: string } | undefined };
}

beforeEach(() => { db.rider = { is_active: true, suspended_reason: null }; db.updateError = null; db.updates = []; });

it('lets an active rider go online', async () => {
  const { res, err } = await patchStatus({ status: 'online', lat: 13.2, lng: 74.7 });
  expect(err).toBeUndefined();
  expect(db.updates[0]).toMatchObject({ status: 'online', current_lat: 13.2 });
  expect(res.json).toHaveBeenCalledWith({ ok: true });
});

it('refuses to put a suspended rider online and says why', async () => {
  db.rider = { is_active: false, suspended_reason: 'Repeated no-shows' };
  const { err } = await patchStatus({ status: 'online' });
  expect(err).toMatchObject({ status: 403, code: 'RIDER_SUSPENDED' });
  expect(err?.message).toContain('Repeated no-shows');
  expect(db.updates).toHaveLength(0);
});

it('still lets a suspended rider go offline', async () => {
  db.rider = { is_active: false, suspended_reason: 'x' };
  const { err } = await patchStatus({ status: 'offline' });
  expect(err).toBeUndefined();
  expect(db.updates[0]).toEqual({ status: 'offline' });
});

it('maps the database suspension guard to RIDER_SUSPENDED', async () => {
  db.updateError = { code: 'P0403' };
  const { err } = await patchStatus({ status: 'online' });
  expect(err).toMatchObject({ status: 403, code: 'RIDER_SUSPENDED' });
});
