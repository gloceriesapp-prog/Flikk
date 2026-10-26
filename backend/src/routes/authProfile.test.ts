import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const db = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabaseAuth: { auth: {} }, supabase: {
  from: () => ({ update: (patch: unknown) => { db.update(patch); return {
    eq: (...args: unknown[]) => { db.eq(...args); return { select: () => ({ single: async () => ({ data: { name: 'New name' }, error: null }) }) }; },
  }; } }),
} }));
vi.mock('../auth/loginOtp.js', () => ({ CODE_TTL_MINUTES: 10 }));
import { authRouter } from './auth.js';
async function patch(body: unknown) {
  const route = authRouter.stack.find(l => l.route?.path === '/me' && (l.route as unknown as { methods: { patch?: boolean } }).methods.patch)!;
  const handler = route.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ user: { id: 'customer-1' }, body } as unknown as Request, res, next);
  return { res, error: next.mock.calls[0]?.[0] as { code?: string } | undefined };
}
beforeEach(() => vi.clearAllMocks());
it('updates only the signed-in customer name', async () => {
  const { res, error } = await patch({ name: ' New name ' });
  expect(error).toBeUndefined(); expect(db.update).toHaveBeenCalledWith({ name: 'New name' });
  expect(db.eq).toHaveBeenCalledWith('id', 'customer-1');
  expect(res.json).toHaveBeenCalledWith({ name: 'New name' });
});
it('rejects retired and unexpected profile fields before any database write', async () => {
  for (const body of [{ birthday: '2000-01-01' }, { name: 'Test', birthday: '2000-01-01' }, { phone: '123' }, null, []]) {
    expect((await patch(body)).error?.code).toBe('INVALID_PROFILE_FIELDS');
  }
  expect(db.update).not.toHaveBeenCalled();
});
it('rejects missing, non-text and unbounded names', async () => {
  for (const body of [{}, { name: 42 }, { name: ' ' }, { name: 'a'.repeat(101) }]) expect((await patch(body)).error?.code).toBe('INVALID_NAME');
  expect(db.update).not.toHaveBeenCalled();
});
