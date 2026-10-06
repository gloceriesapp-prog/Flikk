import { supabase } from '../db/supabase.js';
import { randomUUID } from 'node:crypto';
import { findCheckoutAttempt, checkoutAttemptIdentity } from '../lib/checkoutAttempts.js';
import { loadCheckoutAvailability } from '../lib/checkoutEligibilityService.js';
import { Router } from 'express';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../lib/errors.js';
import { createCheckoutQuote } from '../lib/checkoutQuoteService.js';
import { rejectUnsupportedTip } from '../lib/checkoutQuote.js';

export const checkoutRouter = Router();
checkoutRouter.post('/quote', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    rejectUnsupportedTip(req.body);
    if (req.body.promo_code != null && typeof req.body.promo_code !== 'string') {
      throw new AppError(400, 'INVALID_PROMO', 'Choose a valid promo code.');
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(await createCheckoutQuote(req.body.items, req.user!.id, req.body.promo_code, req.body.address_id));
  } catch (error) { next(error); }
});

checkoutRouter.post('/availability', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { eligible, issues, lines } = await loadCheckoutAvailability(req.body.items, req.user!.id, req.body.address_id);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ eligible, issues, lines });
  } catch (error) { next(error); }
});

checkoutRouter.get('/attempts/:id', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test((req.params.id ?? ''))) throw new AppError(400, 'INVALID_ATTEMPT', 'Invalid checkout attempt.');
    res.setHeader('Cache-Control', 'no-store');
    res.json(await findCheckoutAttempt(req.user!.id, (req.params.id ?? '')));
  } catch (error) { next(error); }
});

checkoutRouter.post('/attempt-id', requireAuth, requireRole('customer'), (_req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.json({ id: randomUUID() });
});

checkoutRouter.post('/attempts/:id/close', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const kind = req.body.kind;
    if (!['order','trip'].includes(kind)) throw new AppError(400, 'INVALID_ATTEMPT', 'Invalid checkout type.');
    const identity = checkoutAttemptIdentity({ ...req.body.input, attempt_id: req.params.id }, kind);
    const { data, error } = await supabase.rpc('close_checkout_attempt', { p_customer_id: req.user!.id,
      p_attempt_id: identity.id, p_fingerprint: identity.fingerprint, p_kind: kind });
    if (error) throw error;
    res.setHeader('Cache-Control', 'no-store'); res.json(data);
  } catch (error) { next(error); }
});
