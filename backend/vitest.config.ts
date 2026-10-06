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
      RAZORPAY_KEY_ID: 'test-key-id',
      RAZORPAY_KEY_SECRET: 'test-key-secret',
      RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
      MAPPLS_ACCESS_TOKEN: 'test-mappls-token',
    },
  },
});
