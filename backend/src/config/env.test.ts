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
  it('rejects an invalid Razorpay environment', async () => {
    await expect(loadEnv({ RAZORPAY_ENV: 'prod' })).rejects.toThrow(/RAZORPAY_ENV/);
  });

  it('rejects mismatched live credentials and test mode', async () => {
    await expect(loadEnv({ RAZORPAY_ENV: 'test', RAZORPAY_KEY_ID: 'rzp_live_dummy' })).rejects.toThrow(/must match/);
  });

  it('infers the environment from the API key when not explicitly configured', async () => {
    const { env } = await loadEnv({ RAZORPAY_ENV: '', RAZORPAY_KEY_ID: 'rzp_live_dummy' });
    expect(env.razorpayEnv).toBe('live');
  });

  it('requires a separate webhook secret and leaves missing configuration disabled', async () => {
    const result = await loadEnv({ RAZORPAY_KEY_ID: 'rzp_test_dummy', RAZORPAY_ENV: 'test', RAZORPAY_WEBHOOK_SECRET: '' });
    expect(result.env.razorpayWebhookSecret).toBeUndefined();
    expect(result.paymentsConfigured).toBe(false);
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
  it('keeps server Maps APIs independently configurable with legacy fallback', async () => {
    vi.stubEnv('GOOGLE_GEOCODING_ROUTE_KEY', undefined as unknown as string);
    const separated = await loadEnv({ GOOGLE_GEOCODING_API_KEY: 'geo-key', GOOGLE_ROUTES_API_KEY: 'route-key', GOOGLE_PLACES_API_KEY: 'places-key' });
    expect(separated.env.googleGeocodingApiKey).toBe('geo-key');
    expect(separated.env.googleRoutesApiKey).toBe('route-key');
    expect(separated.env.googlePlacesApiKey).toBe('places-key');
    const legacy = await loadEnv({ GOOGLE_GEOCODING_API_KEY: ' geo-key ', GOOGLE_ROUTES_API_KEY: '', GOOGLE_PLACES_API_KEY: '' });
    expect(legacy.env.googleRoutesApiKey).toBe('geo-key');
    expect(legacy.env.googlePlacesApiKey).toBe('geo-key');
  });

  it('supports the separate route key name without consuming the native map key', async () => {
    const { env } = await loadEnv({ GOOGLE_GEOCODING_API_KEY: 'geo-key', GOOGLE_GEOCODING_MAP_KEY: 'native-key',
      GOOGLE_GEOCODING_ROUTE_KEY: ' route-key ', GOOGLE_ROUTES_API_KEY: '' });
    expect(env.googleRoutesApiKey).toBe('route-key');
    expect(env.googleGeocodingApiKey).toBe('geo-key');
  });
  it('does not silently reuse geocoding when a separate route key is explicitly empty', async () => {
    const { env } = await loadEnv({ GOOGLE_GEOCODING_API_KEY: 'geo-key', GOOGLE_GEOCODING_ROUTE_KEY: '', GOOGLE_ROUTES_API_KEY: '' });
    expect(env.googleRoutesApiKey).toBeUndefined();
  });
  it('keeps routes disabled in the new separated-key setup until a routing key is supplied', async () => {
    const { env } = await loadEnv({ GOOGLE_GEOCODING_API_KEY: 'geo-key', GOOGLE_GEOCODING_MAP_KEY: 'native-key',
      GOOGLE_GEOCODING_ROUTE_KEY: undefined, GOOGLE_ROUTES_API_KEY: '' });
    expect(env.googleRoutesApiKey).toBeUndefined();
  });
  it('rejects conflicting routing aliases without exposing either value', async () => {
    await expect(loadEnv({ GOOGLE_GEOCODING_ROUTE_KEY: 'new-route-key', GOOGLE_ROUTES_API_KEY: 'old-route-key' }))
      .rejects.toThrow('GOOGLE_GEOCODING_ROUTE_KEY and GOOGLE_ROUTES_API_KEY disagree');
  });

});
