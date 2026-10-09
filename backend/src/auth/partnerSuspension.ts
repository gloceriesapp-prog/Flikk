// Admin partner-account suspension (migration 114: users.partner_suspended,
// set only by admin_set_partner_suspension from the admin store page).
// Looked up per store-owner request with a short cache, the same revocation
// window authenticate.ts allows for its own context cache.
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { BoundedCache } from './boundedCache.js';

export interface PartnerSuspension { suspended: boolean; reason: string | null }
const cache = new BoundedCache<PartnerSuspension>(20_000, 500);
const TTL_MS = 15_000;

export async function partnerSuspension(userId: string): Promise<PartnerSuspension> {
  return cache.get(userId, TTL_MS, async () => {
    const { data, error } = await supabase
      .from('users')
      .select('partner_suspended, partner_suspended_reason, store_memberships!user_id(is_active, stores!store_id(owner:users!owner_user_id(partner_suspended,partner_suspended_reason)))')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // Deployed before migration 114: nobody can be suspended yet.
      if (error.code === '42703' || error.code === 'PGRST204') {
        logger.warn('Partner suspension columns missing; apply migration 114.');
        return { suspended: false, reason: null };
      }
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable. Please retry.');
    }
    const memberships = data?.store_memberships ?? [];
    for (const member of Array.isArray(memberships) ? memberships : [memberships]) {
      if (!member.is_active) continue;
      const store = Array.isArray(member.stores) ? member.stores[0] : member.stores;
      const owner = Array.isArray(store?.owner) ? store.owner[0] : store?.owner;
      if (!owner) throw new AppError(503, 'AUTH_UNAVAILABLE', 'Store access could not be verified.');
      if (owner.partner_suspended) return { suspended: true, reason: owner.partner_suspended_reason ?? 'The store owner account is suspended.' };
    }
    return { suspended: data?.partner_suspended === true, reason: data?.partner_suspended_reason ?? null };
  });
}

export function partnerSuspendedError(reason: string | null): AppError {
  return new AppError(
    403,
    'PARTNER_SUSPENDED',
    reason
      ? `Your partner account is suspended by Gloceries: ${reason}. Contact Gloceries support.`
      : 'Your partner account is suspended by Gloceries. Contact Gloceries support.',
  );
}
