import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
// Header shape is cheap admission, not authentication. The handler still
// verifies the Cashfree HMAC (base64 SHA-256, 44 chars) over the timestamp +
// original raw bytes, and the replay window, before any financial write.
export const webhookAdmission: RequestHandler = (req, _res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  if (req.method !== 'POST') return next(new AppError(405, 'METHOD_NOT_ALLOWED', 'Use a webhook request.'));
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature) || typeof timestamp !== 'string' || !/^\d{10,13}$/.test(timestamp))
    return next(new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.'));
  next();
};
