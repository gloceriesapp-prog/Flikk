// Anon-key Supabase client — read-only in practice (products_read_all/
// stores_read_active are the only public RLS policies on these tables,
// same as apps/admin's own client.ts). Safe to use from a Server Component
// (this file has no 'use client' — Next.js runs it on the server) since it
// never touches anything beyond a public, unauthenticated read.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
