import { generateKeyPairSync, sign } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ claims: vi.fn(), user: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { auth: { getClaims: mocks.claims, getUser: mocks.user }, rpc: mocks.rpc, from: mocks.from } }));
import { authenticate, invalidateAuthUser, validateClaims } from './authenticate.js';
const user = '10000000-0000-0000-0000-000000000001'; const session = '10000000-0000-0000-0000-000000000002';
const claims = () => ({ sub: user, session_id: session, iss: 'https://test.supabase.co/auth/v1', aud: 'authenticated', role: 'authenticated', exp: Date.now() / 1000 + 3600 });
let token = 0;
beforeEach(() => {
  vi.clearAllMocks(); invalidateAuthUser(user); token += 1;
  mocks.claims.mockResolvedValue({ data: { claims: claims() }, error: null });
  mocks.user.mockResolvedValue({ data: { user: { id: user } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [{ user_id: user, role: 'customer', is_approved: true, session_valid: true, phone: 'test' }], error: null });
});
it('validates claims against this project and rejects expired/anonymous/service tokens', () => {
  expect(validateClaims(claims()).id).toBe(user);
  for (const patch of [{ iss: 'https://foreign/auth/v1' }, { aud: 'anon' }, { role: 'service_role' }, { exp: 1 }, { exp: Infinity }, { nbf: Date.now() / 1000 + 60 }, { session_id: 'bad' }])
    expect(() => validateClaims({ ...claims(), ...patch })).toThrow('Invalid or expired');
});
it('polling reads share verified identity and role/session checks', async () => {
  await Promise.all(Array.from({ length: 20 }, () => authenticate(`token-${token}`, false)));
  expect(mocks.claims).toHaveBeenCalledTimes(1); expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.user).not.toHaveBeenCalled();
});
it('writes bypass cached role/session status and detect revocation', async () => {
  await authenticate(`token-${token}`, false);
  mocks.rpc.mockResolvedValue({ data: [{ user_id: user, role: 'customer', session_valid: false }], error: null });
  await expect(authenticate(`token-${token}`, true)).rejects.toMatchObject({ status: 401 });
  expect(mocks.user).toHaveBeenCalledTimes(1); expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('role invalidation affects all sessions and a profile outage never provisions a customer', async () => {
  await authenticate(`token-${token}`, false); invalidateAuthUser(user);
  mocks.rpc.mockResolvedValue({ data: null, error: { code: '08006' } });
  await expect(authenticate(`token-${token}`, false)).rejects.toMatchObject({ status: 503 }); expect(mocks.from).not.toHaveBeenCalled();
});
it('admin reads always perform fresh authorization', async () => {
  mocks.rpc.mockResolvedValue({ data: [{ user_id: user, role: 'admin', is_approved: true, session_valid: true }], error: null });
  await authenticate(`token-${token}`, false); await authenticate(`token-${token}`, false);
  expect(mocks.rpc).toHaveBeenCalledTimes(2); expect(mocks.user).toHaveBeenCalledTimes(2);
});
it('cannot turn a JWT signature failure into a role-cache hit', async () => {
  mocks.claims.mockResolvedValue({ data: null, error: { status: 401 } });
  await expect(authenticate(`bad-token-${token}`, false)).rejects.toMatchObject({ status: 401 }); expect(mocks.rpc).not.toHaveBeenCalled();
});

it('uses the SDK to verify a real ES256 signature locally and reject tampering', async () => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'ES256', use: 'sig' };
  const sdk = createClient('https://test.supabase.co', 'test-key', { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: vi.fn(async () => { throw new Error('Unexpected remote request'); }) } });
  mocks.claims.mockImplementation((token: string) => sdk.auth.getClaims(token, { jwks: { keys: [jwk] } }));
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: 'fixture-key', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims())).toString('base64url');
  const body = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(body), { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  expect((await authenticate(`${body}.${signature}`, false)).id).toBe(user);
  const corrupted = Buffer.from(signature, 'base64url'); corrupted[0] = corrupted[0]! ^ 1;
  await expect(authenticate(`${body}.${corrupted.toString('base64url')}`, false)).rejects.toMatchObject({ status: 401 });
});

it('rejects a cached authorization exactly when its known session expiry is reached', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  try {
    mocks.rpc.mockResolvedValue({ data: [{ user_id: user, role: 'customer', is_approved: true, session_valid: true,
      session_expires_at: new Date(now + 1000).toISOString() }], error: null });
    await authenticate(`expires-${token}`, false);
    clock.mockReturnValue(now + 1001);
    await expect(authenticate(`expires-${token}`, false)).rejects.toMatchObject({ status: 401 });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  } finally { clock.mockRestore(); }
});
it('does not extend JWT validity with its identity cache', async () => {
  const now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  try {
    mocks.claims.mockResolvedValue({ data: { claims: { ...claims(), exp: (now + 1000) / 1000 } }, error: null });
    await authenticate(`jwt-expiry-${token}`, false);
    clock.mockReturnValue(now + 1001);
    await expect(authenticate(`jwt-expiry-${token}`, false)).rejects.toMatchObject({ status: 401 });
    expect(mocks.claims).toHaveBeenCalledTimes(1);
  } finally { clock.mockRestore(); }
});
it('rechecks revoked read sessions within the maximum cache TTL', async () => {
  const now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  try {
    await authenticate(`ttl-${token}`, false);
    mocks.rpc.mockResolvedValue({ data: [{ user_id: user, role: 'customer', session_valid: false }], error: null });
    clock.mockReturnValue(now + 30_001);
    await expect(authenticate(`ttl-${token}`, false)).rejects.toMatchObject({ status: 401 });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  } finally { clock.mockRestore(); }
});
it('bounds direct remote verification for concurrent mutation requests', async () => {
  await authenticate(`burst-${token}`, false);
  let release!: (value: unknown) => void;
  const wait = new Promise(resolve => { release = resolve; });
  mocks.user.mockReturnValue(wait);
  const attempts = Array.from({ length: 200 }, () => authenticate(`burst-${token}`, true));
  const completed = Promise.allSettled(attempts);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(mocks.user).toHaveBeenCalledTimes(128);
  release({ data: { user: { id: user } }, error: null });
  const results = await completed;
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(128);
  expect(results.filter(result => result.status === 'rejected').every(result =>
    ['AUTH_BUSY', 'AUTH_CHANGED'].includes((result as PromiseRejectedResult).reason.code))).toBe(true);
});
it('rejects an authorization lookup that completes after a realtime role invalidation', async () => {
  let resolve!: (value: unknown) => void;
  let started!: () => void;
  const loading = new Promise<void>(done => { started = done; });
  mocks.rpc.mockImplementation(() => { started(); return new Promise(done => { resolve = done; }); });
  const request = authenticate(`revoked-in-flight-${token}`, false);
  const rejected = expect(request).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
  await loading; invalidateAuthUser(user);
  resolve({ data: [{ user_id: user, role: 'admin', is_approved: true, session_valid: true }], error: null });
  await rejected;
  expect(mocks.user).not.toHaveBeenCalled();
});
it('ignores client metadata claiming admin privileges', async () => {
  mocks.claims.mockResolvedValue({ data: { claims: { ...claims(), user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } } }, error: null });
  expect((await authenticate(`metadata-${token}`, false)).role).toBe('customer');
});
it('can force remote verification on reads during an emergency signing-key revocation', async () => {
  const { env } = await import('../config/env.js'); const previous = env.forceRemoteAuth;
  try {
    await authenticate(`emergency-${token}`, false);
    env.forceRemoteAuth = true;
    mocks.user.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    await expect(authenticate(`emergency-${token}`, false)).rejects.toMatchObject({ status: 401 });
    expect(mocks.user).toHaveBeenCalledTimes(1);
  } finally { env.forceRemoteAuth = previous; }
});
it('rejects a token that expires while its authorization lookup is pending', async () => {
  const now = Date.now(); const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  let resolve!: (value: unknown) => void; let started!: () => void;
  const loading = new Promise<void>(done => { started = done; });
  mocks.claims.mockResolvedValue({ data: { claims: { ...claims(), exp: (now + 1000) / 1000 } }, error: null });
  mocks.rpc.mockImplementation(() => { started(); return new Promise(done => { resolve = done; }); });
  try {
    const request = authenticate(`expires-during-lookup-${token}`, false);
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    await loading; clock.mockReturnValue(now + 1001);
    resolve({ data: [{ user_id: user, role: 'customer', is_approved: true, session_valid: true }], error: null });
    await rejected;
  } finally { clock.mockRestore(); }
});
it('fails closed in production when the session RPC has not been deployed', async () => {
  const { env } = await import('../config/env.js');
  const previous = env.requireSessionContext;
  env.requireSessionContext = true;
  mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
  try {
    await expect(authenticate(`schema-${token}`, false)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' });
    expect(mocks.user).not.toHaveBeenCalled();
  } finally { env.requireSessionContext = previous; }
});
