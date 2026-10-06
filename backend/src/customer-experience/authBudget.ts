import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { env } from '../config/env.js';
import { normalizePhone } from '../lib/phone.js';
import { AppError } from '../lib/errors.js';

type Action = 'send' | 'verify' | 'partner-check' | 'refresh';
const limits = { send: [30, 1], verify: [120, 5], 'partner-check': [60, 5], refresh: [120, 0] } as const;
export function authBucket(action: string, subject: string): string {
  return createHmac('sha256', process.env.AUTH_BUDGET_SECRET || env.supabaseServiceRoleKey).update(`${action}:${subject}`).digest('hex');
}
export function authBudget(action: Action): RequestHandler {
  return async (req, res, next) => {
    try {
      const [ipLimit, phoneLimit] = limits[action];
      const buckets: { key: string; limit: number }[] = [{ key: authBucket(`${action}:ip`, req.ip || req.socket.remoteAddress || 'unknown'), limit: ipLimit }];
      if (phoneLimit) buckets.push({ key: authBucket(`${action}:phone`, normalizePhone(req.body?.phone)), limit: phoneLimit });
      const { data, error } = await supabase.rpc('claim_auth_budget', { p_buckets: buckets });
      if (error || !Number.isSafeInteger(data) || data < 0) throw new AppError(503, 'AUTH_TEMPORARILY_UNAVAILABLE', 'Sign-in is temporarily unavailable. Please retry.');
      if (data > 0) {
        res.set('Retry-After', String(data));
        throw new AppError(429, 'AUTH_RATE_LIMITED', 'Too many attempts. Wait a minute and try again.');
      }
      next();
    } catch (error) { next(error); }
  };
}
export async function pruneAuthBudgets() {
  const { error } = await supabase.rpc('prune_auth_budgets');
  if (error) throw error;
}
