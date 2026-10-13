import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
// Cheap admission only. The payment handler authenticates the original raw
// request bytes with Razorpay's separate webhook secret before any DB write.
export const webhookAdmission: RequestHandler = (req, _res, next) => {
  if (req.method !== 'POST') return next(new AppError(405, 'METHOD_NOT_ALLOWED', 'Use a webhook request.'));
  const signature = req.headers['x-razorpay-signature'];
  if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) {
    return next(new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.'));
  }
  next();
};
