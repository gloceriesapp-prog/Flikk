// Cashfree side of checkout: create/recover the provider order and reconcile
// it from a server read. Same rules as Razorpay (recovery.ts): the durable
// claim allows one create, a lost response recovers by our deterministic
// order_id, and only a server-read SUCCESS payment with the exact amount,
// currency and order settles. App callbacks never mark anything paid.
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { readPaymentEmail } from './contact.js';
import { CASHFREE_ORDER_ID, CASHFREE_PAYMENT_ID, CashfreeError, createCfOrder, getCfOrder, getCfOrderPayments, paiseFromRupees, type CfOrder } from './cashfreeClient.js';
import { checkoutReceipt, toPaise } from './razorpayClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import type { ReconciledPayment, Target } from './recovery.js';

export interface CashfreeOrderRef { id: string; amount: number; paymentSessionId?: string }

function checkCfOrder(target: Target, order: CfOrder, total: number): CashfreeOrderRef {
  const tag = target.kind === 'trip' ? order.order_tags?.gloceries_trip_id : order.order_tags?.gloceries_order_id;
  if (!CASHFREE_ORDER_ID.test(order.order_id) || order.order_id !== checkoutReceipt(target.id) || tag !== target.id
    || order.order_currency !== 'INR' || paiseFromRupees(order.order_amount) !== toPaise(total))
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need review. Contact support before paying again.');
  return { id: order.order_id, amount: toPaise(total), paymentSessionId: order.payment_session_id };
}
async function attach(target: Target, order: CashfreeOrderRef, total: number) {
  const { error } = await supabase.rpc('attach_checkout_provider_order', {
    p_kind: target.kind, p_target_id: target.id, p_provider_order_id: order.id, p_expected_paise: toPaise(total), p_provider: 'cashfree',
  });
  if (error) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need support review.');
  return order;
}

export async function recoverCashfreeOrder(target: Target, total: number): Promise<CashfreeOrderRef | undefined> {
  const { data: session, error } = await supabase.from('checkout_payment_sessions').select('provider_order_id,payment_provider').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
  if (error) throw error;
  if (session?.payment_provider !== 'cashfree') return undefined;
  const order = await getCfOrder(session.provider_order_id ?? checkoutReceipt(target.id));
  if (!order) return undefined;
  return attach(target, checkCfOrder(target, order, total), total);
}

// Called only while this request holds the first claim (gateway.ts).
export async function createCashfreeOrder(target: Target, total: number, customerId: string, expiresAt: Date): Promise<CashfreeOrderRef> {
  const { data: customer, error } = await supabase.from('users').select('phone').eq('id', customerId).single();
  if (error) throw error;
  const digits = typeof customer.phone === 'string' ? customer.phone.replace(/\D/g, '') : '';
  const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^\d{10}$/.test(phone)) throw new AppError(409, 'PAYMENT_CONTACT_REQUIRED', 'Add a valid phone number in Profile to pay online.');
  // Email only when the customer gave a real one (never the login alias).
  const email = await readPaymentEmail(customerId).catch(() => null);
  const orderId = checkoutReceipt(target.id);
  const tags: Record<string, string> = target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id };
  let order: CfOrder | null;
  try {
    order = await createCfOrder({ orderId, amountPaise: toPaise(total), customerId, phone, ...(email ? { email } : {}), tags, expiresAt });
  } catch (error) {
    // 409 = this order_id already exists (an earlier lost response): adopt it.
    if (!(error instanceof CashfreeError && error.providerStatus === 409)) throw error;
    order = await getCfOrder(orderId);
    if (!order) throw error;
  }
  return attach(target, checkCfOrder(target, order, total), total);
}

export async function reconcileCashfree(target: Target, providerOrderId: string, total: number, openIsPending = true): Promise<ReconciledPayment> {
  const order = await getCfOrder(providerOrderId);
  if (!order) throw new AppError(409, 'PAYMENT_RECONCILING', 'Payment is being confirmed.');
  checkCfOrder(target, order, total);
  const payments = await getCfOrderPayments(providerOrderId);
  const expected = toPaise(total);
  for (const payment of payments) {
    if (!CASHFREE_PAYMENT_ID.test(String(payment.cf_payment_id)) || payment.order_id !== providerOrderId || payment.payment_currency !== 'INR' || paiseFromRupees(payment.payment_amount) !== expected)
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment amount or order could not be verified. Contact support.');
  }
  const succeeded = payments.filter(payment => payment.payment_status === 'SUCCESS');
  let accepted = false;
  for (const payment of succeeded) {
    // Settlement records duplicate successes as durable incidents for review.
    accepted = await settleCheckoutPayment(target.target, String(payment.cf_payment_id), expected, 'INR', providerOrderId, 'cashfree') || accepted;
  }
  if (succeeded.length) return { state: accepted ? 'paid' : 'cancelled', canResumeUpiIntent: false };
  // PENDING money can still succeed: never let COD/cancel race it. An
  // untouched attempt may be abandoned when the caller says so.
  const pending = payments.some(payment => payment.payment_status === 'PENDING' || (openIsPending && payment.payment_status === 'NOT_ATTEMPTED'));
  return { state: pending ? 'pending' : 'unpaid', canResumeUpiIntent: false };
}
