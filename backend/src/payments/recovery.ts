import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { razorpay } from './razorpayClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import type { OrderIdBody } from './types.js';

export function paymentTarget(input: OrderIdBody) {
  if (Boolean(input.orderId) === Boolean(input.tripId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Choose exactly one order or trip.');
  const id = (input.tripId ?? input.orderId)!;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Invalid order ID.');
  return { id, kind: input.tripId ? 'trip' : 'order', table: input.tripId ? 'trips' : 'orders', target: input };
}
export interface PaymentSession {
  provider_order_id: string | null;
  upi_state: 'creating' | 'ready' | null;
  upi_payment_id: string | null;
  upi_link: string | null;
  reconcile_state?: string;
}
export async function claimPayment(target: ReturnType<typeof paymentTarget>, customerId: string, mode: 'order' | 'upi') {
  const { data, error } = await supabase.rpc('claim_checkout_payment', {
    p_customer_id: customerId, p_kind: target.kind, p_target_id: target.id, p_mode: mode,
  });
  if (error?.code === 'P0410') throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout is paid, expired or cancelled. Check your order status.');
  if (error?.code === 'P0403') throw new AppError(403, 'FORBIDDEN', 'Not your checkout.');
  if (error) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Payment recovery is unavailable. Please try again shortly.');
  return data as { session: PaymentSession; claimed: boolean; total: number };
}
export async function saveSession(target: ReturnType<typeof paymentTarget>, patch: Partial<PaymentSession>) {
  const { error } = await supabase.from('checkout_payment_sessions').update(patch).eq('kind', target.kind).eq('target_id', target.id);
  if (error) throw error;
}
// Receipt lookup recovers a provider order accepted just before a process
// crash. An absent result NEVER authorizes another order creation.
export async function recoverProviderOrder(target: ReturnType<typeof paymentTarget>, total: number) {
  const response = await razorpay.orders.all({ receipt: target.id, count: 100 });
  const matches = response.items.filter((item) => item.receipt === target.id && item.currency === 'INR'
    && Number(item.amount) === Math.round(Number(total) * 100));
  if (matches.length > 1) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Multiple payment records need review. Contact support before paying again.');
  const order = matches[0];
  if (order) await saveSession(target, { provider_order_id: order.id });
  return order;
}
export async function ensureProviderOrder(target: ReturnType<typeof paymentTarget>, customerId: string) {
  const claim = await claimPayment(target, customerId, 'order');
  if (claim.session.provider_order_id) return razorpay.orders.fetch(claim.session.provider_order_id);
  if (!claim.claimed) {
    const recovered = await recoverProviderOrder(target, claim.total);
    if (recovered) return recovered;
    throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly without starting another checkout.');
  }
  // Adoption also covers unpaid orders created by older app versions.
  const existing = await recoverProviderOrder(target, claim.total);
  if (existing) return existing;
  // Persist the claim BEFORE the external side effect. Do not clear it on
  // timeout: we cannot know whether Razorpay accepted that request.
  const order = await razorpay.orders.create({ amount: Math.round(Number(claim.total) * 100), currency: 'INR', receipt: target.id,
    notes: target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id } });
  await saveSession(target, { provider_order_id: order.id });
  return order;
}
export async function reconcileProvider(target: ReturnType<typeof paymentTarget>, providerOrderId: string, total: number) {
  const payments = await razorpay.orders.fetchPayments(providerOrderId);
  for (const payment of payments.items) {
    if (payment.order_id !== providerOrderId || payment.currency !== 'INR' || Number(payment.amount) !== Math.round(Number(total) * 100))
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment amount or order could not be verified. Contact support.');
  }
  const captured = payments.items.find((payment) => payment.status === 'captured');
  if (captured) return await settleCheckoutPayment(target.target, captured.id) ? 'paid' : 'cancelled';
  return payments.items.some((payment) => payment.status === 'authorized' || payment.status === 'created') ? 'pending' : 'unpaid';
}
export async function requirePaymentRetrySafe(target: ReturnType<typeof paymentTarget>, providerOrderId: string, total: number) {
  const state = await reconcileProvider(target, providerOrderId, total);
  if (state !== 'unpaid') throw new AppError(409, 'PAYMENT_RECONCILING', state === 'paid'
    ? 'Payment is confirmed. Open your order.' : 'Your previous payment is being confirmed. Please wait before paying again.');
}
export async function getPaymentRecovery(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const target = paymentTarget(req.body);
    const { data: record, error } = await supabase.from(target.table).select('*').eq('id', target.id).eq('customer_id', req.user!.id).single();
    if (error || !record) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const { data: session, error: sessionError } = await supabase.from('checkout_payment_sessions').select('*').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
    if (sessionError) throw sessionError;
    let state = record.checkout_payment_rejected || record.status === 'cancelled' || record.status === 'failed' ? 'cancelled'
      : record.razorpay_payment_id || record.payment_method === 'cod' ? 'paid' : 'unpaid';
    if (!record.razorpay_payment_id && state !== 'paid') {
      if (session) {
        const { data: lease, error: leaseError } = await supabase.rpc('claim_payment_reconciliation', { p_kind: target.kind, p_target_id: target.id });
        if (leaseError) throw leaseError;
        if (lease.claimed) {
          const providerId = session.provider_order_id ?? (await recoverProviderOrder(target, record.total))?.id;
          state = providerId ? await reconcileProvider(target, providerId, record.total) : 'reconciling';
          if (state === 'unpaid' && session.upi_state === 'creating') state = 'reconciling';
          await saveSession(target, { reconcile_state: state });
        } else state = lease.state;
      } else {
        // Legacy payments have no session row. Receipt lookup checks delayed
        // success before exposing a retry; create-order adopts the same ID.
        const provider = await recoverProviderOrder(target, record.total);
        if (provider) state = await reconcileProvider(target, provider.id, record.total);
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
    else if (current.razorpay_payment_id || current.payment_method === 'cod') state = 'paid';
    res.setHeader('Cache-Control', 'no-store');
    res.json({ target: target.target, state, record: current });
  } catch (error) { next(error); }
}
export async function getPendingPayments(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [orders, legs] = await Promise.all([
      supabase.from('orders').select('id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('razorpay_payment_id', null).is('trip_id', null).gte('placed_at', new Date(Date.now() - 20 * 60_000).toISOString()).order('placed_at', { ascending: false }).limit(20),
      supabase.from('orders').select('trip_id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('razorpay_payment_id', null).not('trip_id', 'is', null).gte('placed_at', new Date(Date.now() - 20 * 60_000).toISOString()).order('placed_at', { ascending: false }).limit(40),
    ]);
    if (orders.error) throw orders.error;
    if (legs.error) throw legs.error;
    const targets = [...(orders.data ?? []).map((order) => ({ target: { orderId: order.id }, at: order.placed_at })),
      ...[...new Map((legs.data ?? []).map((leg) => [leg.trip_id, leg])).values()].map((leg) => ({ target: { tripId: leg.trip_id }, at: leg.placed_at }))]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    res.setHeader('Cache-Control', 'no-store'); res.json(targets.map((row) => row.target));
  } catch (error) { next(error); }
}
