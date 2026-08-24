// Server-only Supabase client — service_role key, bypasses RLS entirely.
// NEVER import this from a 'use client' component or any file that ends up
// in the browser bundle; only app/api/products/* route handlers (server
// code) should touch it. This exists because products/stores RLS write
// policies require an authenticated store-owner session (auth.uid()), and
// this admin dashboard has no login flow yet — a founder using this tool
// is trusted by definition, so writes route through this privileged
// server-side client instead of loosening RLS to allow anonymous writes
// (which would let anyone with the public anon key, visible in the
// client bundle, write arbitrary products).

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
