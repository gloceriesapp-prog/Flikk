import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const db = vi.hoisted(() => ({
  ready: true, rpcError: null as { code: string; message: string } | null,
  rpc: vi.fn(),
}));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: (table: string) => {
    const builder = {
      select: () => builder, eq: () => builder,
      single: () => Promise.resolve({ data: { vehicle_type: 'scooter' }, error: null }),
      maybeSingle: () => Promise.resolve({ data: table === 'media_assets' && db.ready ? { id: 'asset' } : null, error: null }),
    };
    return builder;
  },
  rpc: (...args: unknown[]) => { db.rpc(...args); return Promise.resolve({ data: 'request-id', error: db.rpcError }); },
} }));
vi.mock('../lib/notifications.js', () => ({ createNotification: vi.fn() }));
import { riderRouter } from './rider.js';
const userId = '00000000-0000-4000-8000-000000000001';
const ownPath = `${userId}/dl-00000000-0000-4000-8000-000000000002.jpg`;
const handler = riderRouter.stack.find((layer) => layer.route?.path === '/profile-changes' && layer.route?.methods?.post)!.route!.stack.at(-1)!.handle as RequestHandler;
async function submit(body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: userId }, body } as unknown as Request, res, next);
  return { res, error: next.mock.calls[0]?.[0] };
}
beforeEach(() => { db.ready = true; db.rpcError = null; db.rpc.mockClear(); });
it('stores a ready owned document in a review request scoped to the authenticated rider', async () => {
  const { res, error } = await submit({ licencePhotoPath: ownPath });
  expect(error).toBeUndefined();
  expect(db.rpc).toHaveBeenCalledWith('submit_rider_profile_change', {
    p_user_id: userId, p_changes: { dl_photo_url: ownPath },
  });
  expect(res.status).toHaveBeenCalledWith(201);
});
it('rejects a different rider document before touching the change RPC', async () => {
  const { error } = await submit({ licencePhotoPath: ownPath.replace(userId, '00000000-0000-4000-8000-000000000099') });
  expect(error).toMatchObject({ code: 'INVALID_DOCUMENT', status: 400 });
  expect(db.rpc).not.toHaveBeenCalled();
});
it('rejects an uploaded path that has no ready owned asset', async () => {
  db.ready = false;
  const { error } = await submit({ licencePhotoPath: ownPath });
  expect(error).toMatchObject({ code: 'INVALID_DOCUMENT', status: 400 });
  expect(db.rpc).not.toHaveBeenCalled();
});
it('turns concurrent pending request conflicts into a helpful 409', async () => {
  db.rpcError = { code: '23505', message: 'unique pending request' };
  const { error } = await submit({ licenceNumber: 'VALID LICENCE' });
  expect(error).toMatchObject({ code: 'REVIEW_PENDING', status: 409 });
});
