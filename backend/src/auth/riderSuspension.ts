// Admin rider-account suspension (migration 110: riders.is_active=false +
// suspended_reason, set only by admin_set_rider_suspension from the admin
// Riders page). The mirror of auth/partnerSuspension.ts: looked up per
// rider request with the same short cache and revocation window as
// authenticate.ts's own context cache, so a suspension takes effect within
// one TTL on every rider data route — not only on the go-online path.
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { BoundedCache } from './boundedCache.js';

export interface RiderSuspension { suspended: boolean; reason: string | null }
const cache = new BoundedCache<RiderSuspension>(20_000, 500);
const TTL_MS = 15_000;

export async function riderSuspension(userId: string): Promise<RiderSuspension> {
  return cache.get(userId, TTL_MS, async () => {
    const { data, error } = await supabase
      .from('riders')
      .select('is_active, suspended_reason')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      // Deployed before migration 110: suspended_reason does not exist, and
      // nobody can be admin-suspended yet.
      if (error.code === '42703' || error.code === 'PGRST204') {
        logger.warn('Rider suspension columns missing; apply migration 110.');
        return { suspended: false, reason: null };
      }
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable. Please retry.');
    }
    // No riders row yet (role granted but profile not created) is not a
    // suspension — the handlers 404 that case on their own. is_active=false
    // is the one and only account bit every dispatch RPC already honours.
    if (data && data.is_active === false) return { suspended: true, reason: data.suspended_reason ?? null };
    return { suspended: false, reason: null };
  });
}

export function riderSuspendedError(reason: string | null): AppError {
  return new AppError(
    403,
    'RIDER_SUSPENDED',
    reason ? `Your rider account is suspended: ${reason}` : 'Your rider account is suspended. Contact Gloceries support.',
  );
}
