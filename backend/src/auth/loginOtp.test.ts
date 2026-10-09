import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const query = { select: () => query, in: () => query, limit: () => query, maybeSingle };
  return {
    maybeSingle,
    supabase: {
      from: vi.fn(() => query),
      auth: { admin: { createUser: vi.fn(), listUsers: vi.fn(), updateUserById: vi.fn(), getUserById: vi.fn() } },
    },
    supabaseAuth: { auth: { signInWithPassword: vi.fn() } },
  };
});
vi.mock('../db/supabase.js', () => ({ supabase: db.supabase, supabaseAuth: db.supabaseAuth }));
import { checkLoginOtp, consumeLoginOtp, isPhoneBanned, requestLoginOtp, resetLoginOtpsForTests, sessionForVerifiedPhone, testOtps } from './loginOtp.js';

const phone = '+919876543210';
let sent: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  resetLoginOtpsForTests();
  sent = [];
  vi.stubEnv('MSG91_AUTH_KEY', 'test-auth-key');
  vi.stubEnv('MSG91_OTP_TEMPLATE_ID', 'template-1');
  vi.stubGlobal('fetch', vi.fn(async (_url: URL, init: RequestInit) => {
    sent.push(JSON.parse(init.body as string).recipients[0].OTP);
    return Response.json({ type: 'success', message: 'req-1' });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('login OTP', () => {
  it('sends a 6-digit code through MSG91; it stays valid until the sign-in succeeds', async () => {
    await requestLoginOtp(phone);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/^\d{6}$/);
    expect(checkLoginOtp(phone, sent[0])).toBe(true);
    // A sign-in failure after a correct code: the same code works again.
    expect(checkLoginOtp(phone, sent[0])).toBe(true);
    consumeLoginOtp(phone);
    expect(checkLoginOtp(phone, sent[0])).toBe(false);
  });

  it('a wrong code does not spoil the right one', async () => {
    await requestLoginOtp(phone);
    const wrong = sent[0] === '000000' ? '111111' : '000000';
    expect(checkLoginOtp(phone, wrong)).toBe(false);
    expect(checkLoginOtp(phone, sent[0])).toBe(true);
  });

  it('only the latest code works, valid for 10 minutes', async () => {
    const t = 1_000_000;
    await requestLoginOtp(phone, t);
    await requestLoginOtp(phone, t);
    if (sent[0] !== sent[1]) expect(checkLoginOtp(phone, sent[0], t)).toBe(false);
    expect(checkLoginOtp(phone, sent[1], t + 9 * 60_000)).toBe(true);
    expect(checkLoginOtp(phone, sent[1], t + 10 * 60_000)).toBe(false);
  });

  it('locks the code after 5 wrong attempts', async () => {
    await requestLoginOtp(phone);
    const wrong = sent[0] === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) expect(checkLoginOtp(phone, wrong)).toBe(false);
    expect(checkLoginOtp(phone, sent[0])).toBe(false);
  });

  it('fails the request (and stores nothing) when MSG91 rejects the SMS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ type: 'error', message: 'Invalid template' })));
    await expect(requestLoginOtp(phone)).rejects.toMatchObject({ code: 'OTP_SEND_FAILED' });
  });

  it('logs the code instead of failing in local development without MSG91 keys', async () => {
    vi.stubEnv('MSG91_AUTH_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    await expect(requestLoginOtp(phone)).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses to send in production without MSG91 keys', async () => {
    vi.stubEnv('MSG91_AUTH_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    await expect(requestLoginOtp(phone)).rejects.toMatchObject({ code: 'OTP_SEND_FAILED' });
  });

  it('test numbers use their fixed code and never send an SMS', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await requestLoginOtp('+919100000001');
    expect(fetch).not.toHaveBeenCalled();
    expect(checkLoginOtp('+919100000001', '123456')).toBe(true);
    expect(checkLoginOtp('+919100000001', '654321')).toBe(false);
  });

  it('has no built-in test numbers in production, only LOGIN_TEST_OTPS', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(testOtps(undefined).size).toBe(0);
    expect([...testOtps('919000000009=246810, 9000000008 = 135790, bad=1')]).toEqual([
      ['+919000000009', '246810'], ['+919000000008', '135790'],
    ]);
  });
});

describe('sessionForVerifiedPhone', () => {
  it('signs in an existing user with a fresh one-time password', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'user-1' } });
    db.supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'a' } }, error: null });
    const result = await sessionForVerifiedPhone(phone);
    expect(result.data.session).toEqual({ access_token: 'a' });
    expect(db.supabase.auth.admin.createUser).not.toHaveBeenCalled();
    const { password } = db.supabase.auth.admin.updateUserById.mock.calls[0][1];
    expect(db.supabaseAuth.auth.signInWithPassword).toHaveBeenCalledWith({ phone, password });
  });

  it('creates a confirmed auth user for a new phone', async () => {
    db.maybeSingle.mockResolvedValue({ data: null });
    db.supabase.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });
    db.supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await sessionForVerifiedPhone(phone);
    expect(db.supabase.auth.admin.createUser).toHaveBeenCalledWith({ phone, phone_confirm: true });
    expect(db.supabase.auth.admin.updateUserById.mock.calls[0][0]).toBe('new-user');
  });

  it('finds an auth-only user when the phone already exists in auth', async () => {
    db.maybeSingle.mockResolvedValue({ data: null });
    db.supabase.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'phone_exists' } });
    db.supabase.auth.admin.listUsers.mockResolvedValue({ data: { users: [{ id: 'other', phone: '919000000000' }, { id: 'old-user', phone: '919876543210' }] }, error: null });
    db.supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await sessionForVerifiedPhone(phone);
    expect(db.supabase.auth.admin.updateUserById.mock.calls[0][0]).toBe('old-user');
  });

  it('reports a banned account', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'user-1' } });
    db.supabase.auth.admin.getUserById.mockResolvedValue({ data: { user: { banned_until: '2999-01-01T00:00:00Z' } } });
    expect(await isPhoneBanned(phone)).toBe(true);
    db.supabase.auth.admin.getUserById.mockResolvedValue({ data: { user: { banned_until: null } } });
    expect(await isPhoneBanned(phone)).toBe(false);
  });
});

describe('sessionForVerifiedPhone with a missing auth user', () => {
  it('recreates the auth user under the public.users id', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'orphan' } });
    db.supabase.auth.admin.updateUserById.mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found' } });
    db.supabase.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'orphan' } }, error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await sessionForVerifiedPhone(phone);
    expect(db.supabase.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'orphan', phone, phone_confirm: true }));
    const { password } = db.supabase.auth.admin.createUser.mock.calls[0][0];
    expect(db.supabaseAuth.auth.signInWithPassword).toHaveBeenCalledWith({ phone, password });
  });
});

describe('sessionForVerifiedPhone when another auth user holds the phone', () => {
  it('signs in as the auth user that owns the phone', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'stale-row' } });
    db.supabase.auth.admin.updateUserById
      .mockResolvedValueOnce({ data: { user: null }, error: { status: 500, message: 'Error updating user' } })
      .mockResolvedValueOnce({ data: { user: { id: 'owner' } }, error: null });
    db.supabase.auth.admin.listUsers.mockResolvedValue({ data: { users: [{ id: 'owner', phone: '919876543210' }] }, error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    await sessionForVerifiedPhone(phone);
    expect(db.supabase.auth.admin.updateUserById.mock.calls[1][0]).toBe('owner');
  });

  it('throws SIGN_IN_FAILED (logged with the step) when Supabase refuses the sign-in', async () => {
    db.maybeSingle.mockResolvedValue({ data: { id: 'user-1' } });
    db.supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
    db.supabaseAuth.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { code: 'phone_provider_disabled', status: 422 } });
    await expect(sessionForVerifiedPhone(phone)).rejects.toMatchObject({ code: 'SIGN_IN_FAILED' });
  });
});
