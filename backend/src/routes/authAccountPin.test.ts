import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';

// One-phone-one-app pin, checked at the /otp/request boundary (migration
// 20261011000000). A number already pinned to a different app is refused with
// ACCOUNT_WRONG_APP before any SMS is sent; a matching or brand-new number is
// let through; LOGIN_TEST_OTPS numbers skip the pin; a request with no `app`
// keeps the legacy behaviour (no pin check).
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
// supabase.from('users').select('account_type').in(...).limit(...).maybeSingle()
const pinned = vi.hoisted(() => ({ value: null as string | null }));
const usersChain = {
  select: () => usersChain,
  in: () => usersChain,
  limit: () => usersChain,
  maybeSingle: async () => ({ data: pinned.value ? { account_type: pinned.value } : null }),
};
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => usersChain }, supabaseAuth: { auth } }));
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
  pinned.value = null;
});

it('refuses a number pinned to a different app, without sending an SMS', async () => {
  pinned.value = 'rider';
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'customer' });
  expect(error).toMatchObject({ status: 403, code: 'ACCOUNT_WRONG_APP' });
  expect(login.requestLoginOtp).not.toHaveBeenCalled();
});

it('allows a number signing into its own app', async () => {
  pinned.value = 'rider';
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'rider' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalledWith('+919876543210');
});

it('allows a brand-new (unpinned) number into any app', async () => {
  pinned.value = null;
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'rider' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalled();
});

it('exempts LOGIN_TEST_OTPS numbers from the pin', async () => {
  pinned.value = 'store_owner';
  login.testOtps.mockReturnValue(new Map([['+919876543210', '123456']]));
  const { error } = await post('/otp/request', { phone: '9876543210', app: 'rider' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalled();
});

it('skips the pin entirely when no app is sent (legacy clients)', async () => {
  pinned.value = 'store_owner';
  const { error } = await post('/otp/request', { phone: '9876543210' });
  expect(error).toBeUndefined();
  expect(login.requestLoginOtp).toHaveBeenCalled();
});
