import { expect, it } from 'vitest';
import { readAuthClientConfig, validatedClientIp } from './clientConfig.js';

it('requires a new server secret for forwarding and rejects ambiguous flags', () => {
  expect(readAuthClientConfig({})).toEqual({ secretKey: undefined, forwardClientIp: false });
  expect(() => readAuthClientConfig({ SUPABASE_AUTH_FORWARD_CLIENT_IP: 'true' })).toThrow('required');
  expect(() => readAuthClientConfig({ SUPABASE_AUTH_SECRET_KEY: 'legacy.jwt' })).toThrow('sb_secret');
  expect(() => readAuthClientConfig({ SUPABASE_AUTH_FORWARD_CLIENT_IP: 'yes' })).toThrow('true or false');
  expect(readAuthClientConfig({ SUPABASE_AUTH_FORWARD_CLIENT_IP: 'true', SUPABASE_AUTH_SECRET_KEY: 'sb_secret_example' })).toEqual({ forwardClientIp: true, secretKey: 'sb_secret_example' });
});
it('accepts one real IPv4/IPv6 address, rejecting raw forwarded lists and header injection', () => {
  for (const value of ['127.0.0.1', '2001:db8::1', '::ffff:192.0.2.1']) expect(validatedClientIp(value)).toBe(value);
  for (const value of ['127.0.0.1, 192.0.2.1', 'example.com', '127.0.0.1\r\nAuth: bad', undefined]) expect(validatedClientIp(value)).toBeUndefined();
});
