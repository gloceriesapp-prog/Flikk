// Anon-key Supabase client — read-only in practice (products_read_all/
// stores_read_active are the only public RLS policies on these tables,
// same as apps/admin's own client.ts). Safe to use from a Server Component
// (this file has no 'use client' — Next.js runs it on the server) since it
// never touches anything beyond a public, unauthenticated read.

import { createClient } from '@supabase/supabase-js';
import { catalogueConfig } from './catalogueConfig';

const config = catalogueConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  VERCEL_ENV: process.env.VERCEL_ENV,
  APP_ENV: process.env.APP_ENV,
});

// A slow or unreachable database must never hold the page: give up after
// 5s and render without products (each section hides itself when empty).
export const supabase = config ? createClient(config.url, config.anonKey, {
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) },
}) : null;
