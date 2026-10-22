import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), refreshSession: vi.fn() }));
const login = vi.hoisted(() => ({ CODE_TTL_MINUTES: 10, isPhoneBanned: vi.fn(), requestLoginOtp: vi.fn(), checkLoginOtp: vi.fn(), consumeLoginOtp: vi.fn(), sessionForVerifiedPhone: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {}, supabaseAuth: { auth } }));
vi.mock('../auth/loginOtp.js', () => login);
import { authRouter } from './auth.js';

function handler(path: string): RequestHandler {
  return authRouter.stack.find(l => l.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function post(path: string, body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(path)({ body } as unknown as Request, res, next);
  return { error: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined, res };
}
const banned = { data: { session: null }, error: { status: 403, code: 'user_banned', message: 'User is banned' } };

beforeEach(() => vi.clearAllMocks());

it('tells a blocked customer why OTP sign-in fails, without sending an SMS', async () => {
  login.isPhoneBanned.mockResolvedValue(true);
  expect((await post('/otp/request', { phone: '9876543210' })).error).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
  expect(login.requestLoginOtp).not.toHaveBeenCalled();
  login.checkLoginOtp.mockReturnValue(true);
  login.sessionForVerifiedPhone.mockResolvedValue(banned);
  expect((await post('/otp/verify', { phone: '9876543210', code: '123456' })).error).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
});

it('sends the code for the canonical +91 number', async () => {
  login.isPhoneBanned.mockResolvedValue(false);
  const { error, res } = await post('/otp/request', { phone: '98765 43210' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalledWith('+919876543210');
  expect(res.json).toHaveBeenCalledWith({ ok: true, expires_in_minutes: 10 });
});

it('refuses to refresh a blocked session with ACCOUNT_BLOCKED', async () => {
  auth.refreshSession.mockResolvedValue(banned);
  expect((await post('/refresh', { refresh_token: 'r' })).error).toMatchObject({ status: 403, code: 'ACCOUNT_BLOCKED' });
});

it.each(['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'user_not_found', 'invalid_credentials'])(
  'rejects revoked or invalid refresh credentials: %s', async (code) => {
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 400, code } });
    expect((await post('/refresh', { refresh_token: 'r' })).error).toMatchObject({ status: 401, code: 'INVALID_REFRESH_TOKEN' });
  });

it.each([{ status: 503, code: 'unexpected_failure' }, { status: 0, name: 'AuthRetryableFetchError' },
  { status: 409, code: 'conflict' }, { status: 403, code: 'provider_disabled' }])(
  'keeps provider failures retryable instead of expiring sessions: %j', async (error) => {
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error });
    expect((await post('/refresh', { refresh_token: 'r' })).error).toMatchObject({ status: 503, code: 'REFRESH_UNAVAILABLE' });
  });

it('preserves provider rate limits and rejects malformed input before provider calls', async () => {
  auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 429, code: 'over_request_rate_limit' } });
  expect((await post('/refresh', { refresh_token: 'r' })).error).toMatchObject({ status: 429, code: 'REFRESH_UNAVAILABLE' });
  auth.refreshSession.mockClear();
  for (const refresh_token of [null, 123, {}, '', '   ']) {
    expect((await post('/refresh', { refresh_token })).error).toMatchObject({ status: 400, code: 'MISSING_REFRESH_TOKEN' });
  }
  expect(auth.refreshSession).not.toHaveBeenCalled();
});

it('treats a missing provider session as unavailable and returns rotated tokens on success', async () => {
  auth.refreshSession.mockResolvedValue({ data: { session: null }, error: null });
  expect((await post('/refresh', { refresh_token: 'r' })).error).toMatchObject({ status: 503, code: 'REFRESH_UNAVAILABLE' });
  auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'a', refresh_token: 'b' } }, error: null });
  const result = await post('/refresh', { refresh_token: 'r' });
  expect(result.error).toBeUndefined();
  expect(result.res.json).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'b' });
});

it('keeps a wrong code as OTP_INVALID and never creates a session for it', async () => {
  login.checkLoginOtp.mockReturnValue(false);
  expect((await post('/otp/verify', { phone: '9876543210', code: '123456' })).error).toMatchObject({ status: 401, code: 'OTP_INVALID' });
  expect(login.sessionForVerifiedPhone).not.toHaveBeenCalled();
});

it('keeps the code usable when the sign-in fails, and uses it up only after success', async () => {
  login.checkLoginOtp.mockReturnValue(true);
  login.sessionForVerifiedPhone.mockRejectedValue(Object.assign(new Error('x'), { status: 500, code: 'SIGN_IN_FAILED' }));
  expect((await post('/otp/verify', { phone: '9876543210', code: '123456' })).error).toMatchObject({ code: 'SIGN_IN_FAILED' });
  expect(login.consumeLoginOtp).not.toHaveBeenCalled();
});
