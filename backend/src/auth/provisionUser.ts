import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

const unavailable = () => new AppError(503, 'AUTH_TEMPORARILY_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please retry.');
export async function verifiedUserProfile(userId: string, canonicalPhone: string) {
  const initial = await supabase.from('users').select('is_approved, role').eq('id', userId).maybeSingle();
  if (initial.error) throw unavailable();
  if (initial.data) return initial.data;
  // Ignore conflicts: simultaneous first logins must never reset role/approval.
  const created = await supabase.from('users').upsert(
    { id: userId, phone: canonicalPhone, role: 'customer' },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (created.error) throw unavailable();
  const current = await supabase.from('users').select('is_approved, role').eq('id', userId).maybeSingle();
  if (current.error || !current.data) throw unavailable();
  return current.data;
}
