import { afterEach, expect, it, vi } from 'vitest';
const clients = vi.hoisted(() => ({ fallback: { auth: {} }, factory: vi.fn((key: string, ip: string) => ({ key, ip })) }));
vi.mock('../db/supabase.js', () => ({ supabaseAuth: clients.fallback, createRequestAuthClient: clients.factory }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });
it('keeps legacy client compatibility with forwarding disabled', async () => {
  vi.stubEnv('SUPABASE_AUTH_FORWARD_CLIENT_IP', 'false');
  const { authForRequest } = await import('./requestClient.js');
  expect(authForRequest('127.0.0.1')).toBe(clients.fallback);
  expect(clients.factory).not.toHaveBeenCalled();
});
it('creates isolated client headers for each resolved request IP', async () => {
  vi.stubEnv('SUPABASE_AUTH_FORWARD_CLIENT_IP', 'true'); vi.stubEnv('SUPABASE_AUTH_SECRET_KEY', 'sb_secret_test');
  const { authForRequest } = await import('./requestClient.js');
  const first = authForRequest('192.0.2.1'); const second = authForRequest('2001:db8::2');
  expect(first).not.toBe(second);
  expect(clients.factory.mock.calls).toEqual([['sb_secret_test', '192.0.2.1'], ['sb_secret_test', '2001:db8::2']]);
  expect(() => authForRequest('192.0.2.1,192.0.2.2')).toThrow('temporarily unavailable');
  expect(clients.factory).toHaveBeenCalledTimes(2);
});
