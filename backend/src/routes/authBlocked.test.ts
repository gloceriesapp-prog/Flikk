import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn(), refreshSession: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {}, supabaseAuth: { auth } }));
import { authRouter } from './auth.js';

function handler(path: string): RequestHandler {
  return authRouter.stack.find(l => l.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function post(path: string, body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(path)({ body } as unknown as Request, res, next);
  return next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined;
}
const banned = { data: { session: null }, error: { status: 403, code: 'user_banned', message: 'User is banned' } };

beforeEach(() => vi.clearAllMocks());

it('tells a blocked customer why OTP sign-in fails', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: banned.error });
  expect(await post('/otp/request', { phone: '9876543210' })).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
  auth.verifyOtp.mockResolvedValue(banned);
  expect(await post('/otp/verify', { phone: '9876543210', code: '123456' })).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
});

it('refuses to refresh a blocked session with ACCOUNT_BLOCKED', async () => {
  auth.refreshSession.mockResolvedValue(banned);
  expect(await post('/refresh', { refresh_token: 'r' })).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
});

it('keeps a wrong code as OTP_INVALID', async () => {
  auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { status: 403, code: 'otp_expired' } });
  expect(await post('/otp/verify', { phone: '9876543210', code: '123456' })).toMatchObject({ status: 401, code: 'OTP_INVALID' });
});

it.each([
  ['/otp/request', 'signInWithOtp', { phone: '9876543210' }],
  ['/otp/verify', 'verifyOtp', { phone: '9876543210', code: '123456' }],
  ['/refresh', 'refreshSession', { refresh_token: 'r' }],
] as const)('does not treat %s provider outages as bad credentials', async (path, method, body) => {
  auth[method].mockResolvedValue({ data: { session: null }, error: { status: 503, code: 'unexpected_failure' } });
  expect(await post(path, body)).toMatchObject({ status: 503, code: 'AUTH_TEMPORARILY_UNAVAILABLE' });
  auth[method].mockResolvedValue({ data: { session: null }, error: { status: 429 } });
  expect(await post(path, body)).toMatchObject({ status: 429, code: 'AUTH_RATE_LIMITED' });
  auth[method].mockRejectedValue(new TypeError('fetch failed'));
  expect(await post(path, body)).toMatchObject({ status: 503, code: 'AUTH_TEMPORARILY_UNAVAILABLE' });
});
