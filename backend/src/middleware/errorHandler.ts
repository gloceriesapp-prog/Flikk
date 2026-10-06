import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import { AppError, toErrorBody } from '../lib/errors.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json(toErrorBody(err));
  }
  if (err && typeof err === 'object' && 'type' in err) {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'The uploaded content is too large.' } });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid request content.' } });
  }
  logger.error({ err }, 'Request failed');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } });
}
