import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// env.ts validates required vars eagerly on import (correct for runtime — fail
// fast on missing config). Unit tests import modules that transitively pull in
// the Supabase client, so tests need *some* value here, not real credentials.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../apps/admin/src', import.meta.url)) } },
  test: {
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      RAZORPAY_KEY_ID: 'rzp_test_dummy',
      RAZORPAY_KEY_SECRET: 'test-secret-key',
      RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
      RAZORPAY_ENV: 'test',
      MAPPLS_ACCESS_TOKEN: 'test-mappls-token',
    },
  },
});
