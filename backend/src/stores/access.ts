import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export interface StoreAccess { storeId: string; role: 'owner' | 'manager' }
// Never cached: removing a team member revokes access on the next request.
export async function resolveStoreAccess(userId: string, expectedStoreId?: string): Promise<StoreAccess | null> {
  let query = supabase.from('stores').select('id').eq('owner_user_id', userId);
  if (expectedStoreId) query = query.eq('id', expectedStoreId);
  const { data: owned, error } = await query.maybeSingle();
  if (error) throw error;
  if (owned) return { storeId: owned.id, role: 'owner' };
  let memberQuery = supabase.from('store_memberships').select('store_id').eq('user_id', userId).eq('is_active', true);
  if (expectedStoreId) memberQuery = memberQuery.eq('store_id', expectedStoreId);
  const { data: member, error: memberError } = await memberQuery.maybeSingle();
  if (memberError) throw memberError;
  return member ? { storeId: member.store_id, role: 'manager' } : null;
}
export async function requireStoreAccess(userId: string, expectedStoreId?: string): Promise<StoreAccess> {
  const access = await resolveStoreAccess(userId, expectedStoreId);
  if (!access) throw new AppError(404, 'STORE_NOT_FOUND', 'No store access for this account.');
  return access;
}
