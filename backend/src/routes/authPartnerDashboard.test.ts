import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
const m = vi.hoisted(() => ({
  role: 'store_owner' as string | null, verifiedRole: 'store_owner' as string | null,
  error: null as { code: string } | null, filters: [] as unknown[], insert: vi.fn(),
  send: vi.fn(), mint: vi.fn(), consume: vi.fn(), banned: vi.fn(),
}));
vi.mock('../auth/loginOtp.js', () => ({
  CODE_TTL_MINUTES: 10, isPhoneBanned: m.banned, requestLoginOtp: m.send,
  checkLoginOtp: () => true, consumeLoginOtp: m.consume, sessionForVerifiedPhone: m.mint,
  // Test OTP exemptions must never bypass the existing-partner restriction.
  testOtps: () => new Map([['+919876543210', '123456']]),
}));
vi.mock('../db/supabase.js', () => ({ supabaseAuth: { auth: {} }, supabase: {
  from(table: string) {
    const q = {
      select: () => q, eq: () => q, limit: () => q,
      in: (_column: string, values: unknown) => { m.filters.push(values); return q; },
      insert: m.insert,
      maybeSingle: async () => table === 'users'
        ? { data: m.role ? { id: 'partner', role: m.role, account_type: 'store_owner' } : null, error: m.error }
        : { data: null, error: null },
      single: async () => ({ data: m.verifiedRole ? { role: m.verifiedRole, is_approved: true, account_type: 'store_owner' } : null }),
      then: (resolve: (value: { count: number }) => unknown) => Promise.resolve({ count: 1 }).then(resolve),
    };
    return q;
  },
} }));
import { authRouter } from './auth.js';
async function post(path: string, body: Record<string, unknown> = {}) {
  const handler = authRouter.stack.find(l => l.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler({ body: { phone: '9876543210', code: '123456', app: 'partner_dashboard', ...body } } as Request, res, next);
  return { res, next, error: next.mock.calls[0]?.[0] };
}
beforeEach(() => {
  vi.clearAllMocks(); m.role = 'store_owner'; m.verifiedRole = 'store_owner'; m.error = null; m.filters = [];
  m.banned.mockResolvedValue(false);
  m.mint.mockResolvedValue({ data: { session: { user: { id: 'partner' }, access_token: 'access', refresh_token: 'refresh' } }, error: null });
});
it.each([null, 'customer', 'rider', 'admin'])('does not send OTP to role %s, even for a test OTP account', async role => {
  m.role = role; const { error } = await post('/otp/request');
  expect(error).toMatchObject({ status: 403, code: 'PARTNER_LOGIN_REQUIRED' }); expect(m.send).not.toHaveBeenCalled();
});
it('sends only to an existing partner and normalizes legacy phone forms', async () => {
  const { next } = await post('/otp/request', { phone: '91 98765 43210' });
  expect(next).not.toHaveBeenCalled(); expect(m.send).toHaveBeenCalledWith('+919876543210');
  expect(m.filters[0]).toEqual(['+919876543210', '919876543210', '9876543210']);
});
it('rechecks the role on resend', async () => {
  await post('/otp/request'); m.role = 'customer'; await post('/otp/request'); expect(m.send).toHaveBeenCalledTimes(1);
});
it('fails closed on database errors without sending SMS', async () => {
  m.error = { code: '08006' }; const { error } = await post('/otp/request');
  expect(error).toMatchObject({ status: 503 }); expect(m.send).not.toHaveBeenCalled();
});
it('rejects blocked partners without sending SMS', async () => {
  m.banned.mockResolvedValue(true); const { error } = await post('/otp/request');
  expect(error).toMatchObject({ code: 'ACCOUNT_BLOCKED' }); expect(m.send).not.toHaveBeenCalled();
});
it.each([null, 'customer', 'rider', 'admin'])('preflight also rejects role %s', async role => {
  m.role = role; expect((await post('/otp/partner-check')).error).toMatchObject({ status: 403 });
});
it('accepts a partner preflight without sending OTP', async () => {
  expect((await post('/otp/partner-check')).next).not.toHaveBeenCalled(); expect(m.send).not.toHaveBeenCalled();
});
it('refuses verification if the account is no longer a partner', async () => {
  m.role = 'customer'; expect((await post('/otp/verify')).error).toMatchObject({ status: 403 });
  expect(m.mint).not.toHaveBeenCalled(); expect(m.consume).not.toHaveBeenCalled();
});
it.each([null, 'customer'])('does not create an account or return tokens if the verified user role is %s', async role => {
  m.verifiedRole = role; const { error, res } = await post('/otp/verify');
  expect(error).toMatchObject({ status: 403 }); expect(m.insert).not.toHaveBeenCalled(); expect(res.json).not.toHaveBeenCalled(); expect(m.consume).not.toHaveBeenCalled();
});
it('binds verification to the same existing partner account', async () => {
  m.mint.mockResolvedValue({ data: { session: { user: { id: 'other-user' } } }, error: null });
  expect((await post('/otp/verify')).error).toMatchObject({ status: 403 }); expect(m.consume).not.toHaveBeenCalled();
});
it('returns tokens for the matching existing partner', async () => {
  const { res, next } = await post('/otp/verify'); expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ role: 'store_owner', access_token: 'access' })); expect(m.consume).toHaveBeenCalledOnce();
});
it('keeps mobile partner registration available for new accounts', async () => {
  m.role = null; expect((await post('/otp/request', { app: 'partner' })).next).not.toHaveBeenCalled(); expect(m.send).toHaveBeenCalledOnce();
});

it.each([undefined, 'customer', 'partner'])('dedicated dashboard send route refuses a new phone even with app override %s', async app => {
  m.role = null; const { error } = await post('/partner-dashboard/otp/request', { app });
  expect(error).toMatchObject({ code: 'PARTNER_LOGIN_REQUIRED' }); expect(m.send).not.toHaveBeenCalled();
});
it('dedicated dashboard verify route cannot bypass the partner check', async () => {
  m.role = 'customer'; const { error } = await post('/partner-dashboard/otp/verify', { app: 'customer' });
  expect(error).toMatchObject({ code: 'PARTNER_LOGIN_REQUIRED' }); expect(m.mint).not.toHaveBeenCalled();
});
