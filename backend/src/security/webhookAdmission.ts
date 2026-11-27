import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
// Cheap admission only. The payment handler authenticates the original raw
// request bytes with Razorpay's separate webhook secret before any DB write.
export const webhookAdmission: RequestHandler = (req, _res, next) => {
  if (req.method !== 'POST') return next(new AppError(405, 'METHOD_NOT_ALLOWED', 'Use a webhook request.'));
  // Mounted at /payments/cashfree/webhook too (baseUrl). Cashfree signs with
  // base64 HMAC-SHA256 plus a millisecond timestamp header.
  if (req.baseUrl === '/payments/cashfree/webhook') {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature) || typeof timestamp !== 'string' || !/^\d{10,13}$/.test(timestamp))
      return next(new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.'));
    return next();
  }
  const signature = req.headers['x-razorpay-signature'];
  if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) {
    return next(new AppError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.'));
  }
  next();
};
