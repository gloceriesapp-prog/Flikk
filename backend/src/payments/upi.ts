// UPI flows over Cashfree "Order Pay" (POST /pg/orders/sessions):
//  - POST /payments/upi/intent   { orderId|tripId, app?, platform? } → per-app deep links
//  - POST /payments/upi/collect  { orderId|tripId, vpa, platform? }  → collect request to the VPA
//  - POST /payments/upi/validate { vpa }                             → { valid, name }
// No client-supplied amount anywhere: the Cashfree order is created from the
// saved order total (recovery.ts). The payment itself is only ever trusted via
// webhook / server-side provider reads (verifyPayment.ts), never the client.
import { randomUUID } from 'node:crypto';
import type { Response, NextFunction, RequestHandler } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { authBucket } from '../customer-experience/authBudget.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { CashfreeError, payCfOrder, pickUpiLink, upiLinksFrom, verificationConfigured, verifyCfVpa, type UpiLinks } from './cashfreeClient.js';
import { paymentTarget, ensureProviderOrder, requirePaymentRetrySafe, claimPayment, saveSession, type Target } from './recovery.js';

// Apps without their own Cashfree link (e.g. amazonpay) get links.default.
const APPS = new Set(['default', 'gpay', 'phonepe', 'paytm', 'bhim', 'amazonpay', 'cred', 'whatsapp']);
// Handle: 2-256 of [A-Za-z0-9._-]; PSP handle: letters (e.g. okhdfcbank, ybl).
export const VPA_FORMAT = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/;
const COLLECT_EXPIRY_MINUTES = 10;

function clientOs(platform: unknown): 'android' | 'ios' | 'others' {
  return platform === 'android' || platform === 'ios' ? platform : 'others';
}
// Cashfree refused the request (4xx), or answered without a payment: no UPI
// attempt exists, so release the claim for a corrected retry. Timeouts and
// 5xx keep the claim ('creating'); recovery/claim release it once stale and
// the provider shows no live attempt (claim_checkout_payment, migration 106).
async function releaseFailedClaim(target: Target, err: unknown): Promise<never> {
  const rejected = err instanceof CashfreeError ? err.providerStatus >= 400 && err.providerStatus < 500 : err instanceof AppError;
  if (rejected) await saveSession(target, { upi_state: null, upi_link: null, upi_payment_id: null });
  throw err;
}
function parseLinks(stored: string | null): UpiLinks | null {
  if (!stored) return null;
  try { return upiLinksFrom(JSON.parse(stored) as Record<string, unknown>); } catch { return null; }
}

export async function createUpiIntent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const app = req.body?.app ?? 'default';
    if (typeof app !== 'string' || !APPS.has(app)) throw new AppError(400, 'INVALID_UPI_APP', 'Choose a supported UPI app.');
    const target = paymentTarget(req.body);
    const order = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, order.order_id, order.order_amount);
    const claim = await claimPayment(target, req.user!.id, 'upi');
    if (!claim.claimed) {
      const links = parseLinks(claim.session.upi_link);
      if (links && claim.session.upi_payment_id) {
        res.json({ providerOrderId: order.order_id, providerPaymentId: claim.session.upi_payment_id, app, link: pickUpiLink(links, app), links });
        return;
      }
      throw new AppError(409, 'PAYMENT_RECONCILING', 'Your previous UPI request is being checked. Please wait before paying again.');
    }
    // Fresh idempotency key per claimed attempt: a retry after a rejected
    // request must not be deduplicated to that rejection.
    const { links, providerPaymentId } = await (async () => {
      if (!order.payment_session_id) throw new AppError(502, 'UPI_INTENT_FAILED', 'Could not start UPI payment.');
      const paid = await payCfOrder({
        paymentSessionId: order.payment_session_id, upi: { channel: 'link' },
        idempotencyKey: randomUUID(), os: clientOs(req.body?.platform),
      });
      const links = upiLinksFrom(paid.data?.payload);
      if (!links || !paid.cf_payment_id) throw new AppError(502, 'UPI_INTENT_FAILED', 'Could not start UPI payment.');
      return { links, providerPaymentId: String(paid.cf_payment_id) };
    })().catch((err: unknown) => releaseFailedClaim(target, err));
    await saveSession(target, { upi_state: 'ready', upi_link: JSON.stringify(links), upi_payment_id: providerPaymentId });
    res.status(200).json({ providerOrderId: order.order_id, providerPaymentId, app, link: pickUpiLink(links, app), links });
  } catch (err) { next(err); }
}

export async function createUpiCollect(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const vpa = typeof req.body?.vpa === 'string' ? req.body.vpa.trim() : '';
    if (!VPA_FORMAT.test(vpa)) throw new AppError(400, 'INVALID_VPA', 'Enter a valid UPI ID, like name@bank.');
    // NPCI withdrew UPI collect for merchant payments on Android; Cashfree
    // rejects it there. Refuse before creating any payment attempt.
    if (req.body?.platform === 'android') throw new AppError(400, 'UPI_COLLECT_UNSUPPORTED', 'Paying by UPI ID is not available on Android. Choose a UPI app instead.');
    const target = paymentTarget(req.body);
    const order = await ensureProviderOrder(target, req.user!.id);
    await requirePaymentRetrySafe(target, order.order_id, order.order_amount);
    const claim = await claimPayment(target, req.user!.id, 'upi');
    if (!claim.claimed) throw new AppError(409, 'PAYMENT_RECONCILING', 'Your previous UPI request is being checked. Please wait before paying again.');
    const paid = await (async () => {
      if (!order.payment_session_id) throw new AppError(502, 'UPI_COLLECT_FAILED', 'Could not send the UPI request.');
      const paid = await payCfOrder({
        paymentSessionId: order.payment_session_id, upi: { channel: 'collect', upi_id: vpa, upi_expiry_minutes: COLLECT_EXPIRY_MINUTES },
        idempotencyKey: randomUUID(), os: clientOs(req.body?.platform),
      });
      if (!paid.cf_payment_id) throw new AppError(502, 'UPI_COLLECT_FAILED', 'Could not send the UPI request.');
      return paid;
    })().catch((err: unknown) => releaseFailedClaim(target, err));
    const providerPaymentId = String(paid.cf_payment_id);
    await saveSession(target, { upi_state: 'ready', upi_payment_id: providerPaymentId });
    res.status(200).json({ providerOrderId: order.order_id, providerPaymentId, vpa, expiresAt: paid.data?.expiry ?? null });
  } catch (err) { next(err); }
}

// Per-user and per-IP minute budgets (shared claim_auth_budget windows).
export const UPI_VALIDATE_LIMITS = { user: 5, ip: 20 } as const;
export const upiValidateBudget: RequestHandler = async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!.id;
    const { data, error } = await supabase.rpc('claim_auth_budget', { p_buckets: [
      { key: authBucket('upi-validate:user', user), limit: UPI_VALIDATE_LIMITS.user },
      { key: authBucket('upi-validate:ip', req.ip || req.socket?.remoteAddress || 'unknown'), limit: UPI_VALIDATE_LIMITS.ip },
    ] });
    if (error || !Number.isSafeInteger(data) || data < 0) throw new AppError(503, 'UPI_VALIDATION_UNAVAILABLE', 'UPI ID check is unavailable. Please retry.');
    if (data > 0) {
      res.set('Retry-After', String(data));
      throw new AppError(429, 'UPI_VALIDATION_RATE_LIMITED', 'Too many UPI ID checks. Wait a minute and try again.');
    }
    next();
  } catch (error) { next(error); }
};

export async function validateUpiId(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const vpa = typeof req.body?.vpa === 'string' ? req.body.vpa.trim() : '';
    res.setHeader('Cache-Control', 'no-store');
    if (!VPA_FORMAT.test(vpa)) { res.json({ valid: false, name: null }); return; }
    if (!verificationConfigured()) { res.json({ valid: true, name: null }); return; }
    try {
      res.json(await verifyCfVpa(vpa));
    } catch (err) {
      // Lookup is a convenience; the collect request itself is the real check.
      logger.warn({ err }, 'UPI ID lookup unavailable; format-only result');
      res.json({ valid: true, name: null });
    }
  } catch (err) { next(err); }
}
