import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { authBucket } from './authBudget.js';
import { AppError } from '../lib/errors.js';

// Per-IP admission is charged on all requests; provider admission is charged
// only to cache leaders. PostgreSQL shares the limits across backend replicas.
export function mapsBudget(kind: 'client' | 'provider'): RequestHandler {
  return async (req, res, next) => {
    try {
      const subject = kind === 'client' ? req.ip || req.socket.remoteAddress || 'unknown' : 'shared-provider';
      const configured = Number(process.env.MAPS_PROVIDER_REQUESTS_PER_MINUTE ?? 400);
      if (!Number.isSafeInteger(configured) || configured < 1 || configured > 500) throw new AppError(503, 'LOCATION_UNAVAILABLE', 'Location lookup is temporarily unavailable.');
      const { data, error } = await supabase.rpc('claim_auth_budget', { p_buckets: [{
        key: authBucket(`maps:${kind}`, subject), limit: kind === 'client' ? 90 : configured,
      }] });
      if (error || !Number.isSafeInteger(data) || data < 0) throw new AppError(503, 'LOCATION_UNAVAILABLE', 'Location lookup is temporarily unavailable.');
      if (data > 0) {
        res.set('Retry-After', String(data));
        throw new AppError(429, 'LOCATION_RATE_LIMITED', 'Please wait before trying another location lookup.');
      }
      next();
    } catch (error) { next(error); }
  };
}
