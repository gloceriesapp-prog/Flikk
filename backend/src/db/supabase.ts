import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Service-role client: bypasses RLS. Backend-only, never shipped to any app.
// Role-scoping is enforced in application code (see middleware/auth.ts) since
// every request here already carries a verified role.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
