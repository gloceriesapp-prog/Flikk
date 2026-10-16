import { supabase } from '../db/supabase.js';

export async function syncStoreAvailability() {
  const { data, error } = await supabase.rpc('sync_store_availability', { p_limit: 200 });
  if (error) throw error;
  return { more: data === 200 };
}
