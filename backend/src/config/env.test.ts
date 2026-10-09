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

  it('refuses the production Supabase project from a non-production backend', async () => {
    const prod = 'https://bjlknohjdnemxwwoxcsv.supabase.co';
    await expect(loadEnv({ NODE_ENV: 'development', SUPABASE_URL: prod })).rejects.toThrow(/PRODUCTION/);
    await expect(loadEnv({ NODE_ENV: 'development', SUPABASE_URL: prod, ALLOW_PRODUCTION_DATABASE: 'true' })).resolves.toBeDefined();
    await expect(loadEnv({ NODE_ENV: 'production', SUPABASE_URL: prod })).resolves.toBeDefined();
    await expect(loadEnv({ NODE_ENV: 'development', SUPABASE_URL: 'https://qgbuvydwcgjthwqxqylk.supabase.co' })).resolves.toBeDefined();
  });

  it('boots without MAPPLS_ACCESS_TOKEN', async () => {
    const { env } = await loadEnv({ MAPPLS_ACCESS_TOKEN: '' });
    expect(env.mapplsAccessToken).toBeUndefined();
  });
});
