import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { env } from '../config/env.js';
import { normalizePhone } from '../lib/phone.js';
import { AppError } from '../lib/errors.js';
import { TokenBudget } from '../security/admission.js';
import { logger } from '../lib/logger.js';

type Action = 'send' | 'verify' | 'partner-check' | 'refresh';
const limits = { send: [30, 1], verify: [120, 5], 'partner-check': [60, 5], refresh: [120, 0] } as const;

// A rate-limit counter being unavailable must NEVER take down all sign-in.
// When the durable `claim_auth_budget` RPC errors (DB blip/outage/missing),
// we degrade to this per-replica in-memory limiter instead of 503-ing every
// auth request. Loose by design — bounded abuse during an outage, while the
// per-IP edge admission limiter and the SMS provider still apply.
const fallbackBudget = new TokenBudget(50000, 120, 60);
let lastRpcErrorLog = 0;
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
      if (error) {
        // Durable counter unreachable → degrade to the in-process limiter and
        // log (throttled), rather than 503-ing all authentication.
        const now = Date.now();
        if (now - lastRpcErrorLog > 30000) {
          lastRpcErrorLog = now;
          logger.warn({ err: error, action }, 'claim_auth_budget unavailable; using in-process rate-limit fallback');
        }
        const retry = Math.max(0, ...buckets.map((b) => fallbackBudget.claim(b.key)));
        if (retry > 0) {
          res.set('Retry-After', String(retry));
          throw new AppError(429, 'AUTH_RATE_LIMITED', 'Too many attempts. Wait a minute and try again.');
        }
        next();
        return;
      }
      if (!Number.isSafeInteger(data) || data < 0) {
        // Unexpected RPC shape: fail open (allow) rather than block all sign-in.
        logger.error({ data, action }, 'claim_auth_budget returned an unexpected value');
        next();
        return;
      }
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
