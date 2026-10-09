import express, { Router, type RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { concurrentAdmission, TokenBudget } from '../../security/admission.js';
import { uploadBodyDeadline } from '../../security/bodyDeadline.js';
import { createSendSmsHookHandler } from './hook.js';
import { createMsg91Client } from './msg91.js';
import { smsReceipts } from './receipts.js';

const budget = new TokenBudget(10000, 1200, 200);
const admission: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['webhook-id', 'webhook-timestamp', 'webhook-signature'].every(name => typeof req.headers[name] === 'string')) {
    res.status(401).json({ error: { http_code: 401, message: 'Invalid SMS signature.' } });
    return;
  }
  if (budget.claim(req.ip || req.socket.remoteAddress || 'unknown')) {
    res.status(429).json({ error: { http_code: 429, message: 'Please retry later.' } });
    return;
  }
  next();
};

// Mount before ordinaryJson: verification must see the exact signed bytes.
export const sendSmsRouter = Router();
sendSmsRouter.post('/send-sms', admission, concurrentAdmission(32), uploadBodyDeadline,
  express.raw({ type: 'application/json', limit: '16kb', inflate: false }),
  createSendSmsHookHandler({ config: env.sms, receipts: smsReceipts, send: createMsg91Client(env.sms) }));
