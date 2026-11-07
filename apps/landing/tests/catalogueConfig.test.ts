import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogueConfig } from '../src/lib/catalogueConfig';

test('unconfigured previews and local builds can render without a catalogue', () => {
  for (const VERCEL_ENV of ['preview', 'development', undefined]) {
    assert.equal(catalogueConfig({ VERCEL_ENV }), null);
    assert.equal(catalogueConfig({ VERCEL_ENV, NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }), null);
    assert.equal(catalogueConfig({ VERCEL_ENV, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' }), null);
  }
});

test('production requires both catalogue settings and never substitutes a fake client', () => {
  for (const production of [{ VERCEL_ENV: 'production' }, { APP_ENV: 'production' }]) {
    for (const settings of [{}, { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' }]) {
      assert.throws(() => catalogueConfig({ ...production, ...settings }), /Production catalogue requires/);
    }
  }
});

test('configured environments retain their explicitly supplied public configuration', () => {
  assert.deepEqual(catalogueConfig({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ', NEXT_PUBLIC_SUPABASE_ANON_KEY: ' public-test-key ' }),
    { url: 'https://example.supabase.co', anonKey: 'public-test-key' });
});
