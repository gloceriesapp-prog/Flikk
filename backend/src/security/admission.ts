import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { metrics } from '../observability/metrics.js';

interface Bucket { tokens: number; updated: number }
// Local first line of defence: no database call for every public request.
// Global cross-replica quotas belong at the edge; auth/maps use durable quotas.
export class TokenBudget {
  private buckets = new Map<string, Bucket>();
  constructor(private readonly capacity: number, private readonly perMinute: number,
    private readonly burst: number, private readonly clock: () => number = Date.now) {}
  claim(key: string): number {
    const now = this.clock();
    let bucket = this.buckets.get(key);
    if (!bucket && this.buckets.size >= this.capacity) {
      const oldest = this.buckets.entries().next().value as [string, Bucket] | undefined;
      if (oldest && now - oldest[1].updated >= 60000 * this.burst / this.perMinute) this.buckets.delete(oldest[0]);
      else return 60; // Never evict an active budget to let churn reset it.
    }
    bucket ??= { tokens: this.burst, updated: now };
    bucket.tokens = Math.min(this.burst, bucket.tokens + Math.max(0, now - bucket.updated) * this.perMinute / 60000);
    bucket.updated = now;
    this.buckets.delete(key); this.buckets.set(key, bucket);
    if (bucket.tokens < 1) return Math.max(1, Math.ceil((1 - bucket.tokens) * 60 / this.perMinute));
    bucket.tokens--; return 0;
  }
}
const publicBudget = new TokenBudget(20000, 3000, 300);
const costlyBudget = new TokenBudget(20000, 300, 60);
const accountBudget = new TokenBudget(30000, 240, 60);
export function accountAdmission(customerId: string): number { return accountBudget.claim(customerId); }
export const requestAdmission: RequestHandler = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  // Signed provider webhooks have their own smaller parser and need provider
  // burst tolerance. Protect them with a separate edge/provider quota.
  if (req.path !== '/payments/webhook') {
    let retry = publicBudget.claim(ip);
    if (!retry && (!['GET','HEAD','OPTIONS'].includes(req.method) || req.path.startsWith('/browse/'))) retry = costlyBudget.claim(ip);
    if (retry) {
      metrics.increment('flikk_admission_rejected_total', { kind: 'ip' });
      res.set('Retry-After', String(retry));
      next(new AppError(429, 'RATE_LIMITED', 'Please wait briefly and try again.')); return;
    }
  }
  next();
};
export function concurrentAdmission(max: number): RequestHandler {
  let active = 0;
  return (_req, res, next) => {
    if (active >= max) {
      metrics.increment('flikk_admission_rejected_total', { kind: 'concurrency' });
      res.set('Retry-After', '2'); next(new AppError(503, 'SERVER_BUSY', 'Please try again shortly.')); return;
    }
    active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once('finish', release); res.once('close', release);
    next();
  };
}
