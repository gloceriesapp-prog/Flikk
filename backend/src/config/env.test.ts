import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadEnv(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value as string);
  return import('./env.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env', () => {
  it('rejects a mistyped CASHFREE_ENV instead of silently using sandbox', async () => {
    await expect(loadEnv({ CASHFREE_ENV: 'prod' })).rejects.toThrow(/CASHFREE_ENV/);
  });

  it('accepts production in any case and with whitespace', async () => {
    const { env } = await loadEnv({ CASHFREE_ENV: ' Production ' });
    expect(env.cashfreeEnv).toBe('production');
  });

  it('defaults an unset CASHFREE_ENV to sandbox', async () => {
    const { env } = await loadEnv({ CASHFREE_ENV: '' });
    expect(env.cashfreeEnv).toBe('sandbox');
  });

  it('boots without MAPPLS_ACCESS_TOKEN', async () => {
    const { env } = await loadEnv({ MAPPLS_ACCESS_TOKEN: '' });
    expect(env.mapplsAccessToken).toBeUndefined();
  });
});
