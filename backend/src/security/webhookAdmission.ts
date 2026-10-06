import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
// Header shape is cheap admission, not authentication. The handler still
// verifies the HMAC over the original raw bytes before any financial write.
export const webhookAdmission: RequestHandler = (req, _res, next) => {
  const signature=req.headers['x-razorpay-signature'];
  if (req.method!=='POST') return next(new AppError(405,'METHOD_NOT_ALLOWED','Use a webhook request.'));
  if (typeof signature!=='string' || !/^[a-f0-9]{64}$/.test(signature))
    return next(new AppError(401,'INVALID_SIGNATURE','Webhook signature verification failed.'));
  next();
};
