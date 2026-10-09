import { logger } from '../lib/logger.js';
import { supabase } from '../db/supabase.js';
import { embeddedPushToken } from '../lib/pushNotifications.js';
export async function storePushRecipients(storeId: string, ownerToken: string | null): Promise<string[]> {
  const { data, error } = await supabase.from('store_memberships')
    .select('users!user_id!inner(expo_push_token)')
    .eq('store_id', storeId).eq('is_active', true).eq('users.is_approved', true).eq('users.role', 'store_owner').limit(20);
  if (error) {
    logger.warn({ err: error, storeId }, 'Store manager push lookup failed');
    return ownerToken ? [ownerToken] : [];
  }
  return [...new Set([ownerToken, ...(data ?? []).map(row => embeddedPushToken(row.users))].filter((token): token is string => !!token))];
}
