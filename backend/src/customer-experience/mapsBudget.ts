import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { authBucket } from './authBudget.js';
import { AppError } from '../lib/errors.js';

// Provider admission is shared by all backend replicas and is only needed
// when a request will reach Google.
export async function claimMapsBudget(kind: 'client' | 'provider', ip = 'unknown'): Promise<number> {
  const subject = kind === 'client' ? ip : 'shared-provider';
  const configured = Number(process.env.MAPS_PROVIDER_REQUESTS_PER_MINUTE ?? 400);
  if (!Number.isSafeInteger(configured) || configured < 1 || configured > 500) {
    throw new AppError(503, 'LOCATION_UNAVAILABLE', 'Location lookup is temporarily unavailable.');
  }
  const { data, error } = await supabase.rpc('claim_auth_budget', { p_buckets: [{
    key: authBucket(`maps:${kind}`, subject), limit: kind === 'client' ? 90 : configured,
  }] });
  if (error || !Number.isSafeInteger(data) || data < 0) {
    throw new AppError(503, 'LOCATION_UNAVAILABLE', 'Location lookup is temporarily unavailable.');
  }
  return data;
}

export function mapsBudget(kind: 'client' | 'provider'): RequestHandler {
  return async (req, res, next) => {
    try {
      const retryAfter = await claimMapsBudget(kind, req.ip || req.socket.remoteAddress);
      if (retryAfter > 0) {
        res.set('Retry-After', String(retryAfter));
        throw new AppError(429, 'LOCATION_RATE_LIMITED', 'Please wait before trying another location lookup.');
      }
      next();
    } catch (error) { next(error); }
  };
}
