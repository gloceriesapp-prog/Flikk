import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { CashfreeError, cashfreeOrderId, createCfOrder, getCfOrder, getCfOrderPayments, toPaise, type CfOrder } from './cashfreeClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import type { OrderIdBody } from './types.js';

export function paymentTarget(input: OrderIdBody) {
  if (Boolean(input.orderId) === Boolean(input.tripId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Choose exactly one order or trip.');
  const id = (input.tripId ?? input.orderId)!;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Invalid order ID.');
  return { id, kind: input.tripId ? 'trip' as const : 'order' as const, table: input.tripId ? 'trips' as const : 'orders' as const, target: input };
}
export type Target = ReturnType<typeof paymentTarget>;
export interface PaymentSession {
  provider_order_id: string | null;
  upi_state: 'creating' | 'ready' | null;
  upi_payment_id: string | null;
  upi_link: string | null;
  reconcile_state?: string;
}
export async function claimPayment(target: Target, customerId: string, mode: 'order' | 'upi') {
  const { data, error } = await supabase.rpc('claim_checkout_payment', {
    p_customer_id: customerId, p_kind: target.kind, p_target_id: target.id, p_mode: mode,
  });
  if (error?.code === 'P0410') throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout is paid, expired or cancelled. Check your order status.');
  if (error?.code === 'P0403') throw new AppError(403, 'FORBIDDEN', 'Not your checkout.');
  if (error) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Payment recovery is unavailable. Please try again shortly.');
  return data as { session: PaymentSession; claimed: boolean; total: number };
}
export async function saveSession(target: Target, patch: Partial<PaymentSession>) {
  const { error } = await supabase.from('checkout_payment_sessions').update(patch).eq('kind', target.kind).eq('target_id', target.id);
  if (error) throw error;
}
// The Cashfree order id is deterministic per target (cashfreeOrderId), so a
// provider order accepted just before a process crash is recovered with a GET
// on that id. An absent result NEVER authorizes another creation by itself;
// creation also needs the durable claim (and Cashfree refuses a duplicate id).
const RESERVATION_MS = 20 * 60_000;
const MIN_PROVIDER_EXPIRY_MS = 16 * 60_000; // Cashfree rejects near-term expiries
function tagsFor(target: Target): Record<string, string> {
  return target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id };
}
function checkProviderOrder(target: Target, order: CfOrder, total: number) {
  const tag = target.kind === 'trip' ? order.order_tags?.gloceries_trip_id : order.order_tags?.gloceries_order_id;
  if (order.order_id !== cashfreeOrderId(target.id) || tag !== target.id || order.order_currency !== 'INR'
    || toPaise(order.order_amount) !== toPaise(total))
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need review. Contact support before paying again.');
  return order;
}
export async function recoverProviderOrder(target: Target, total: number) {
  const order = await getCfOrder(cashfreeOrderId(target.id));
  if (!order) return undefined;
  checkProviderOrder(target, order, total);
  await saveSession(target, { provider_order_id: order.order_id });
  return order;
}
async function createProviderOrder(target: Target, customerId: string, total: number): Promise<CfOrder> {
  const [{ data: customer, error }, { data: leg, error: legError }] = await Promise.all([
    supabase.from('users').select('phone').eq('id', customerId).maybeSingle(),
    supabase.from('orders').select('placed_at').eq(target.kind === 'trip' ? 'trip_id' : 'id', target.id).order('placed_at').limit(1).maybeSingle(),
  ]);
  if (error || legError) throw error ?? legError;
  const phone = String(customer?.phone ?? '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) throw new AppError(409, 'PAYMENT_PHONE_REQUIRED', 'Add a mobile number to your account to pay online.');
  // Reservation expiry, but never sooner than Cashfree accepts; expiry
  // reconciliation terminates the order when the reservation lapses first.
  const placedAt = Date.parse(leg?.placed_at ?? '') || Date.now();
  const expiresAt = new Date(Math.max(placedAt + RESERVATION_MS, Date.now() + MIN_PROVIDER_EXPIRY_MS));
  const orderId = cashfreeOrderId(target.id);
  try {
    return await createCfOrder({ orderId, amountPaise: toPaise(total), customerId, customerPhone: phone, tags: tagsFor(target), expiresAt });
  } catch (err) {
    // order_already_exists: an earlier attempt landed; adopt it.
    if (err instanceof CashfreeError && err.providerStatus === 409) {
      const existing = await getCfOrder(orderId);
      if (existing) return existing;
    }
    throw err;
  }
}
export async function ensureProviderOrder(target: Target, customerId: string): Promise<CfOrder> {
  const claim = await claimPayment(target, customerId, 'order');
  if (claim.session.provider_order_id) {
    if (claim.session.provider_order_id !== cashfreeOrderId(target.id))
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This checkout used an earlier payment system. Contact support before paying again.');
    const order = await getCfOrder(claim.session.provider_order_id);
    if (!order) throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly.');
    return checkProviderOrder(target, order, claim.total);
  }
  const recovered = await recoverProviderOrder(target, claim.total);
  if (recovered) return recovered;
  if (!claim.claimed)
    throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly without starting another checkout.');
  // Persist the claim BEFORE the external side effect. Do not clear it on
  // timeout: we cannot know whether Cashfree accepted that request.
  const order = checkProviderOrder(target, await createProviderOrder(target, customerId, claim.total), claim.total);
  await saveSession(target, { provider_order_id: order.order_id });
  return order;
}
// PENDING/NOT_ATTEMPTED are UPI attempts the customer has not completed (often
// backed out of the UPI app). They block a NEW payment launch, but not an
// explicit abandon: a late SUCCESS after cancel/COD is settled-then-refunded.
export async function reconcileProvider(target: Target, providerOrderId: string, total: number, openIsPending = true) {
  if (providerOrderId !== cashfreeOrderId(target.id))
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment could not be verified. Contact support.');
  const payments = await getCfOrderPayments(providerOrderId);
  for (const payment of payments) {
    if (payment.order_id !== providerOrderId || payment.payment_currency !== 'INR' || toPaise(payment.payment_amount) !== toPaise(total))
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment amount or order could not be verified. Contact support.');
  }
  const success = payments.find((payment) => payment.payment_status === 'SUCCESS');
  if (success) return await settleCheckoutPayment(target.target, String(success.cf_payment_id)) ? 'paid' : 'cancelled';
  return openIsPending && payments.some((payment) => payment.payment_status === 'PENDING' || payment.payment_status === 'NOT_ATTEMPTED') ? 'pending' : 'unpaid';
}
export async function requirePaymentRetrySafe(target: Target, providerOrderId: string, total: number) {
  const state = await reconcileProvider(target, providerOrderId, total);
  if (state !== 'unpaid') throw new AppError(409, 'PAYMENT_RECONCILING', state === 'paid'
    ? 'Payment is confirmed. Open your order.' : 'Your previous payment is being confirmed. Please wait before paying again.');
}
// Trips have no payment_method column; their legs carry it.
export async function paysOnDelivery(target: Target, record: { payment_method?: string }) {
  if (target.kind === 'order') return record.payment_method === 'cod';
  const { data, error } = await supabase.from('orders').select('id').eq('trip_id', target.id).eq('payment_method', 'cod').limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
export async function getPaymentRecovery(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body);
    const { data: record, error } = await supabase.from(target.table).select('*').eq('id', target.id).eq('customer_id', req.user!.id).single();
    if (error || !record) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const { data: session, error: sessionError } = await supabase.from('checkout_payment_sessions').select('*').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
    if (sessionError) throw sessionError;
    let state = record.checkout_payment_rejected || record.status === 'cancelled' || record.status === 'failed' ? 'cancelled'
      : record.provider_payment_id || await paysOnDelivery(target, record) ? 'paid' : 'unpaid';
    if (!record.provider_payment_id && state !== 'paid') {
      if (session) {
        const { data: lease, error: leaseError } = await supabase.rpc('claim_payment_reconciliation', { p_kind: target.kind, p_target_id: target.id });
        if (leaseError) throw leaseError;
        if (lease.claimed) {
          const providerId = session.provider_order_id ?? (await recoverProviderOrder(target, record.total))?.order_id;
          state = providerId ? await reconcileProvider(target, providerId, record.total) : 'reconciling';
          if (state === 'unpaid' && session.upi_state === 'creating') state = 'reconciling';
          await saveSession(target, { reconcile_state: state });
        } else state = lease.state;
      } else {
        // Older checkouts may have no session row. The deterministic-id lookup checks delayed
        // success before exposing a retry; create-order adopts the same ID.
        const provider = await recoverProviderOrder(target, record.total);
        if (provider) state = await reconcileProvider(target, provider.order_id, record.total);
      }
      if (state !== 'paid' && (record.checkout_payment_rejected || record.status === 'cancelled' || record.status === 'failed')) state = 'cancelled';
    }
    if ((state === 'unpaid' || state === 'reconciling') && (record.status !== 'placed' || Date.parse(record.placed_at ?? record.created_at) + 20 * 60_000 <= Date.now())) state = 'expired';
    // Re-read after reconciliation; the response is backend state, never
    // a navigation snapshot or a client payment-success claim.
    const { data: current, error: currentError } = await supabase.from(target.table).select('*').eq('id', target.id).eq('customer_id', req.user!.id).single();
    if (currentError) throw currentError;
    // A webhook/cancellation may have won while the provider read was in flight.
    if (current.checkout_payment_rejected || current.status === 'cancelled' || current.status === 'failed') state = 'cancelled';
    else if (current.provider_payment_id || await paysOnDelivery(target, current)) state = 'paid';
    res.setHeader('Cache-Control', 'no-store');
    res.json({ target: target.target, state, record: current });
  } catch (error) { next(error); }
}
export async function getPendingPayments(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [orders, legs] = await Promise.all([
      supabase.from('orders').select('id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('provider_payment_id', null).is('trip_id', null).gte('placed_at', new Date(Date.now() - 20 * 60_000).toISOString()).order('placed_at', { ascending: false }).limit(20),
      supabase.from('orders').select('trip_id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('provider_payment_id', null).not('trip_id', 'is', null).gte('placed_at', new Date(Date.now() - 20 * 60_000).toISOString()).order('placed_at', { ascending: false }).limit(40),
    ]);
    if (orders.error) throw orders.error;
    if (legs.error) throw legs.error;
    const targets = [...(orders.data ?? []).map((order) => ({ target: { orderId: order.id }, at: order.placed_at })),
      ...[...new Map((legs.data ?? []).map((leg) => [leg.trip_id, leg])).values()].map((leg) => ({ target: { tripId: leg.trip_id }, at: leg.placed_at }))]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    res.setHeader('Cache-Control', 'no-store'); res.json(targets.map((row) => row.target));
  } catch (error) { next(error); }
}
