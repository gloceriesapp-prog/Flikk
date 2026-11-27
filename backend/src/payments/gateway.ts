// Which gateway a NEW checkout uses, and the one-time Cashfree -> Razorpay
// fallback. A checkout's provider is fixed by its first claim
// (claim_checkout_payment) and never changes afterwards, except through
// switch_checkout_provider, which only works before any provider order is
// attached, i.e. before the app could ever hold something payable.
import crypto from 'node:crypto';
import { cashfreeConfigured } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { CashfreeError } from './cashfreeClient.js';
import { createCashfreeOrder, recoverCashfreeOrder, type CashfreeOrderRef } from './cashfreeCheckout.js';
import type { PaymentProviderName } from './provider.js';
import type { RazorpayOrder } from './razorpayClient.js';
import { claimPayment, razorpayOrderFor, type Target } from './recovery.js';

export type GatewayMode = 'razorpay' | 'cashfree' | 'split';
export interface GatewaySetting { mode: GatewayMode; splitPercent: number }
export const DEFAULT_GATEWAY: GatewaySetting = { mode: 'razorpay', splitPercent: 0 };

export function parseGatewaySetting(row: unknown): GatewaySetting {
  const r = (row ?? {}) as { payment_gateway?: unknown; payment_gateway_split_pct?: unknown };
  const mode = r.payment_gateway === 'cashfree' || r.payment_gateway === 'split' ? r.payment_gateway : 'razorpay';
  const pct = Number(r.payment_gateway_split_pct);
  return { mode, splitPercent: Number.isInteger(pct) && pct >= 0 && pct <= 100 ? pct : 0 };
}
// Read fresh per new checkout. Any error (or a pre-migration schema) means Razorpay.
export async function getGatewaySetting(): Promise<GatewaySetting> {
  const { data, error } = await supabase.from('platform_settings').select('payment_gateway, payment_gateway_split_pct').limit(1).maybeSingle();
  return error || !data ? DEFAULT_GATEWAY : parseGatewaySetting(data);
}
// Split is a stable hash of the checkout id, so retries of one checkout always
// land on the same side and the share over many checkouts matches the percent.
export function splitBucket(targetId: string): number {
  return crypto.createHash('sha256').update(targetId).digest().readUInt32BE(0) % 100;
}
export function pickGateway(setting: GatewaySetting, targetId: string, cashfreeReady = cashfreeConfigured): PaymentProviderName {
  if (!cashfreeReady) return 'razorpay';
  if (setting.mode === 'cashfree') return 'cashfree';
  if (setting.mode === 'split') return splitBucket(targetId) < setting.splitPercent ? 'cashfree' : 'razorpay';
  return 'razorpay';
}

export type CheckoutOrder = { provider: 'razorpay'; order: RazorpayOrder } | { provider: 'cashfree'; order: CashfreeOrderRef };

// supportsCashfree: the app build can open Cashfree's SDK. Older builds only
// ever get Razorpay.
export async function ensureCheckoutOrder(target: Target, customerId: string, supportsCashfree: boolean, expiresAt: Date,
  setting?: GatewaySetting): Promise<CheckoutOrder> {
  const { data: session, error } = await supabase.from('checkout_payment_sessions').select('payment_provider').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
  if (error) throw error;
  const wanted: PaymentProviderName = session?.payment_provider === 'cashfree' || session?.payment_provider === 'razorpay' ? session.payment_provider
    : supportsCashfree ? pickGateway(setting ?? await getGatewaySetting(), target.id) : 'razorpay';
  if (wanted === 'cashfree' && !supportsCashfree) throw new AppError(409, 'PAYMENT_APP_UPDATE_REQUIRED', 'Update the app to finish this payment.');
  const claim = await claimPayment(target, customerId, 'order', wanted);
  if (claim.session.payment_provider === 'razorpay') return { provider: 'razorpay', order: await razorpayOrderFor(target, claim.total, claim.claimed) };
  if (claim.session.payment_provider !== 'cashfree') throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This checkout used an earlier payment system. Contact support.');
  const recovered = await recoverCashfreeOrder(target, claim.total);
  if (recovered?.paymentSessionId) return { provider: 'cashfree', order: recovered };
  if (recovered) throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly.');
  if (!claim.claimed) throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly without starting another checkout.');
  try {
    return { provider: 'cashfree', order: await createCashfreeOrder(target, claim.total, customerId, expiresAt) };
  } catch (createError) {
    if (!fallbackAllowed(createError)) throw createError;
    // No payment_session_id ever reached the app, so nothing on Cashfree is
    // payable. switch_checkout_provider refuses once an order is attached or
    // a fallback already happened, so this runs at most once per checkout.
    const { error: switchError } = await supabase.rpc('switch_checkout_provider', { p_kind: target.kind, p_target_id: target.id, p_from: 'cashfree', p_to: 'razorpay' });
    if (switchError) throw createError;
    logger.warn({ target: target.target, providerStatus: createError instanceof CashfreeError ? createError.providerStatus : undefined,
      providerCode: createError instanceof CashfreeError ? createError.providerCode : undefined }, 'Cashfree order failed; checkout fell back to Razorpay');
    return { provider: 'razorpay', order: await razorpayOrderFor(target, claim.total, true) };
  }
}
// Provider failures and a missing phone (Razorpay checkout does not need one)
// fall back; database and review errors do not.
export function fallbackAllowed(error: unknown) {
  return error instanceof CashfreeError || (error instanceof AppError && error.code === 'PAYMENT_CONTACT_REQUIRED');
}
