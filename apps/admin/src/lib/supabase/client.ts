// Browser-safe Supabase client — anon/publishable key, read-only in
// practice (products_read_all and stores_read_active are the only public
// RLS policies on these two tables; every write policy requires
// auth.uid() to match a store's owner_user_id). Safe to import from any
// 'use client' component. Writes to products go through
// app/api/products/* instead (lib/supabase/admin.ts's own client), not
// through this one.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
