import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import { metrics } from '../observability/metrics.js';
import { AppError, toErrorBody } from '../lib/errors.js';

// Issue #26: payment integrity mismatches are never persisted as an order
// state (they RAISE and leave the order untouched), so they are surfaced here,
// at the one error choke point, as a counter + WARN the Prometheus/log
// pipeline can alert on. Covers every PAYMENT_REVIEW_REQUIRED / PAYMENT_MISMATCH
// raise (recovery.ts, validateCapturedPayment.ts) without touching each site.
const MONEY_REVIEW_CODES = new Set(['PAYMENT_REVIEW_REQUIRED', 'PAYMENT_MISMATCH']);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (MONEY_REVIEW_CODES.has(err.code)) {
      metrics.increment('flikk_payment_review_required_total', { code: err.code.toLowerCase() });
      logger.warn({ code: err.code }, 'Payment integrity review required');
    }
    return res.status(err.status).json(toErrorBody(err));
  }
  if (err && typeof err === 'object' && 'type' in err) {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'The uploaded content is too large.' } });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid request content.' } });
  }
  logger.error({ err }, 'Request failed');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } });
}
