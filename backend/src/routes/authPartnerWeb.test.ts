import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

// Partner web dashboard (app 'partner_web'): a code is sent, and a session is
// minted, only for a number whose user role is store_owner. Anything else is
// PARTNER_NOT_REGISTERED with no SMS and no session.
const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), refreshSession: vi.fn() }));
const login = vi.hoisted(() => ({
  CODE_TTL_MINUTES: 10,
  isPhoneBanned: vi.fn().mockResolvedValue(false),
  requestLoginOtp: vi.fn(),
  checkLoginOtp: vi.fn(),
  consumeLoginOtp: vi.fn(),
  sessionForVerifiedPhone: vi.fn(),
  testOtps: vi.fn(() => new Map<string, string>()),
}));
// The users row for the number, if any. The chain applies .eq('role', …) so a
// lookup with a role filter only finds a row with that role.
const user = vi.hoisted(() => ({ value: null as { role: string; account_type: string } | null }));
function usersChain() {
  let role: string | undefined;
  const chain = {
    select: () => chain,
    in: () => chain,
    eq: (column: string, value: string) => {
      if (column === 'role') role = value;
      return chain;
    },
    limit: () => chain,
    maybeSingle: async () => ({ data: user.value && (!role || user.value.role === role) ? { id: 'u1', ...user.value } : null }),
  };
  return chain;
}
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => usersChain() }, supabaseAuth: { auth } }));
vi.mock('../auth/loginOtp.js', () => login);
import { authRouter } from './auth.js';

function handler(path: string): RequestHandler {
  return authRouter.stack.find((l) => l.route?.path === path)!.route!.stack.at(-1)!.handle as RequestHandler;
}
async function post(path: string, body: Record<string, unknown>) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await handler(path)({ body } as unknown as Request, res, next);
  return { error: next.mock.calls[0]?.[0] as { status?: number; code?: string } | undefined, res };
}

beforeEach(() => {
  vi.clearAllMocks();
  login.isPhoneBanned.mockResolvedValue(false);
  login.testOtps.mockReturnValue(new Map());
  user.value = null;
});

it('sends the code to an approved partner', async () => {
  user.value = { role: 'store_owner', account_type: 'store_owner' };
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'partner_web' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalledWith('+919876543210');
});

it('sends nothing to a number that is not in the database', async () => {
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'partner_web' });
  expect(error).toMatchObject({ status: 404, code: 'PARTNER_NOT_REGISTERED' });
  expect(login.requestLoginOtp).not.toHaveBeenCalled();
});

it('sends nothing to a customer, rider, or a partner applicant not yet approved', async () => {
  for (const value of [
    { role: 'customer', account_type: 'customer' },
    { role: 'rider', account_type: 'rider' },
    { role: 'customer', account_type: 'store_owner' },
  ]) {
    user.value = value;
    const { error } = await post('/otp/request', { phone: '9876543210', app: 'partner_web' });
    expect(error).toMatchObject({ status: 404, code: 'PARTNER_NOT_REGISTERED' });
  }
  expect(login.requestLoginOtp).not.toHaveBeenCalled();
});

it('never mints a dashboard session for a non-partner, even with a valid code', async () => {
  user.value = { role: 'customer', account_type: 'customer' };
  login.checkLoginOtp.mockReturnValue(true);
  const { error } = await post('/otp/verify', { phone: '9876543210', code: '123456', app: 'partner_web' });
  expect(error).toMatchObject({ status: 404, code: 'PARTNER_NOT_REGISTERED' });
  expect(login.sessionForVerifiedPhone).not.toHaveBeenCalled();
  expect(login.consumeLoginOtp).not.toHaveBeenCalled();
});

it('partner-check answers with the same rule', async () => {
  expect((await post('/otp/partner-check', { phone: '9876543210' })).error).toMatchObject({ code: 'PARTNER_NOT_REGISTERED' });
  user.value = { role: 'store_owner', account_type: 'store_owner' };
  const { error, res } = await post('/otp/partner-check', { phone: '9876543210' });
  expect(error).toBeUndefined();
  expect(res.json).toHaveBeenCalledWith({ registered: true });
});

it('leaves the partner mobile app flow unchanged for applicants', async () => {
  user.value = { role: 'customer', account_type: 'store_owner' };
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'partner' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalled();
});
