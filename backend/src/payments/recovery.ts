import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { checkoutReceipt, createProviderOrder as createRazorpayOrder, findProviderOrder, getProviderOrder, getOrderPayments, toPaise, type RazorpayOrder } from './razorpayClient.js';
import { settleCheckoutPayment } from './settleCheckoutPayment.js';
import type { OrderIdBody } from './types.js';
import { isValidUpiIntentUrl } from './upiIntentUrl.js';

export function paymentTarget(input: OrderIdBody) {
  if (Boolean(input.orderId) === Boolean(input.tripId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Choose exactly one order or trip.');
  const rawId = (input.tripId ?? input.orderId)!;
  if (typeof rawId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) throw new AppError(400, 'INVALID_PAYMENT_REQUEST', 'Invalid order ID.');
  const id = rawId.toLowerCase();
  return { id, kind: input.tripId ? 'trip' as const : 'order' as const, table: input.tripId ? 'trips' as const : 'orders' as const, target: input.tripId ? { tripId: id } : { orderId: id } };
}
export type Target = ReturnType<typeof paymentTarget>;
export interface PaymentSession {
  provider_order_id: string | null;
  payment_provider?: string;
  reconcile_state?: string;
  upi_resume_allowed?: boolean;
  upi_resume_verified_at?: string;
}
export async function claimPayment(target: Target, customerId: string, mode: 'order') {
  const { data, error } = await supabase.rpc('claim_checkout_payment', {
    p_customer_id: customerId, p_kind: target.kind, p_target_id: target.id, p_mode: mode, p_provider: 'razorpay',
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
// A receipt identifies the checkout across a crash. Razorpay's order creation
// is NOT assumed idempotent: the durable claim permits only the first POST.
// Unknown outcomes recover by receipt; an empty lookup never permits another POST.
function checkProviderOrder(target: Target, order: RazorpayOrder, total: number) {
  const tag = target.kind === 'trip' ? order.notes?.gloceries_trip_id : order.notes?.gloceries_order_id;
  if (!/^order_[A-Za-z0-9]+$/.test(order.id) || order.receipt !== checkoutReceipt(target.id) || tag !== target.id
    || order.currency !== 'INR' || order.amount !== toPaise(total))
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need review. Contact support before paying again.');
  return order;
}
async function attachProviderOrder(target: Target, order: RazorpayOrder, total: number) {
  const { error } = await supabase.rpc('attach_checkout_provider_order', {
    p_kind: target.kind, p_target_id: target.id, p_provider_order_id: order.id, p_expected_paise: toPaise(total), p_provider: 'razorpay',
  });
  if (error) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need support review.');
  return order;
}
export async function recoverProviderOrder(target: Target, total: number) {
  const { data: session, error } = await supabase.from('checkout_payment_sessions').select('provider_order_id,payment_provider').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
  if (error) throw error;
  if (!session) return undefined; // Never reinterpret a historic provider's checkout.
  if (session.payment_provider !== 'razorpay') throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This checkout used an earlier payment system. Contact support.');
  const order = session.provider_order_id ? await getProviderOrder(session.provider_order_id) : await findProviderOrder(checkoutReceipt(target.id));
  if (!order) return undefined;
  checkProviderOrder(target, order, total);
  await attachProviderOrder(target, order, total);
  return order;
}
export async function ensureProviderOrder(target: Target, customerId: string): Promise<RazorpayOrder> {
  const claim = await claimPayment(target, customerId, 'order');
  if (claim.session.payment_provider !== 'razorpay') throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This checkout used an earlier payment system. Contact support.');
  const recovered = await recoverProviderOrder(target, claim.total);
  if (recovered) return recovered;
  if (!claim.claimed) throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous payment request. Please retry shortly without starting another checkout.');
  const { data: leg, error } = await supabase.from('orders').select('reservation_expires_at').eq(target.kind === 'trip' ? 'trip_id' : 'id', target.id).limit(1).maybeSingle();
  if (error) throw error;
  const deadline = Date.parse(leg?.reservation_expires_at ?? '');
  if (!Number.isFinite(deadline) || deadline <= Date.now()) throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout has expired.');
  const notes: Record<string,string> = target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id };
  const order = checkProviderOrder(target, await createRazorpayOrder({ receipt: checkoutReceipt(target.id), amountPaise: toPaise(claim.total), notes }), claim.total);
  return attachProviderOrder(target, order, claim.total);
}
export interface ReconciledPayment { state: 'paid' | 'cancelled' | 'pending' | 'unpaid'; canResumeUpiIntent: boolean; }
// The same provider snapshot determines status and whether reopening the SAME
// created UPI instruction is safe. This adds no second provider read per lease.
export async function reconcileProviderSnapshot(target: Target, providerOrderId: string, total: number, openIsPending = true): Promise<ReconciledPayment> {
  const { data: session, error } = await supabase.from('checkout_payment_sessions').select('provider_order_id,payment_provider,upi_state,upi_payment_id,upi_link').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
  if (error) throw error;
  if (session?.payment_provider !== 'razorpay' || session.provider_order_id !== providerOrderId)
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment could not be verified. Contact support.');
  const order = await getProviderOrder(providerOrderId);
  if (!order) throw new AppError(409, 'PAYMENT_RECONCILING', 'Payment is being confirmed.');
  checkProviderOrder(target, order, total);
  const payments = await getOrderPayments(providerOrderId);
  for (const payment of payments) {
    if (payment.order_id !== providerOrderId || payment.currency !== 'INR' || payment.amount !== toPaise(total))
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment amount or order could not be verified. Contact support.');
  }
  const captured = payments.filter(payment => payment.status === 'captured' && payment.captured === true);
  let accepted = false;
  for (const payment of captured) {
    // Settlement records duplicate captures as durable incidents for review.
    accepted = await settleCheckoutPayment(target.target, payment.id, payment.amount, 'INR', providerOrderId) || accepted;
  }
  if (captured.length) return { state: accepted ? 'paid' : 'cancelled', canResumeUpiIntent: false };
  // Authorized funds can still capture: never permit COD/cancellation to
  // race a known authorization. A merely created attempt may be abandoned.
  const pending = payments.some(payment => payment.status === 'authorized' || (openIsPending && payment.status === 'created'));
  const unresolved = payments.filter(payment => payment.status !== 'failed');
  const activePayment = unresolved.length === 1 ? unresolved[0] : undefined;
  const canResumeUpiIntent = pending && session.upi_state === 'ready'
    && activePayment?.status === 'created' && activePayment.captured === false && activePayment.id === session.upi_payment_id
    && isValidUpiIntentUrl(session.upi_link, toPaise(total));
  return { state: pending ? 'pending' : 'unpaid', canResumeUpiIntent };
}
export async function reconcileProvider(target: Target, providerOrderId: string, total: number, openIsPending = true) {
  return (await reconcileProviderSnapshot(target, providerOrderId, total, openIsPending)).state;
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
export function canResumeCachedUpiIntent(session: { upi_state?: string; upi_payment_id?: string; upi_link?: string;
  upi_resume_allowed?: boolean; upi_resume_verified_at?: string }, total: number, now = Date.now()) {
  const checkedAt = Date.parse(session.upi_resume_verified_at ?? '');
  return session.upi_resume_allowed === true && session.upi_state === 'ready'
    && /^pay_[A-Za-z0-9]+$/.test(session.upi_payment_id ?? '')
    && Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= 10_000
    && isValidUpiIntentUrl(session.upi_link, toPaise(total));
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
    let canResumeUpiIntent = false;
    if (!record.provider_payment_id && state !== 'paid') {
      if (session) {
        const { data: lease, error: leaseError } = await supabase.rpc('claim_payment_reconciliation', { p_kind: target.kind, p_target_id: target.id });
        if (leaseError) throw leaseError;
        if (lease.claimed) {
          const providerId = session.provider_order_id ?? (await recoverProviderOrder(target, record.total))?.id;
          if (providerId) {
            const snapshot = await reconcileProviderSnapshot(target, providerId, record.total);
            state = snapshot.state; canResumeUpiIntent = snapshot.canResumeUpiIntent;
          } else state = 'reconciling';
          await saveSession(target, { reconcile_state: state, upi_resume_allowed: canResumeUpiIntent,
            upi_resume_verified_at: new Date().toISOString() });
        } else {
          state = lease.state;
          canResumeUpiIntent = canResumeCachedUpiIntent(session, record.total);
        }
      } else {
        // A session is required to identify the provider; legacy rows require support.
        const provider = await recoverProviderOrder(target, record.total);
        if (provider) state = await reconcileProvider(target, provider.id, record.total);
      }
      if (state !== 'paid' && (record.checkout_payment_rejected || record.status === 'cancelled' || record.status === 'failed')) state = 'cancelled';
    }
    if ((state === 'unpaid' || state === 'reconciling') && (record.status !== 'placed' || Date.parse(record.reservation_expires_at) <= Date.now())) state = 'expired';
    // Re-read after reconciliation; the response is backend state, never
    // a navigation snapshot or a client payment-success claim.
    const { data: current, error: currentError } = await supabase.from(target.table).select('*').eq('id', target.id).eq('customer_id', req.user!.id).single();
    if (currentError) throw currentError;
    // A webhook/cancellation may have won while the provider read was in flight.
    if (current.checkout_payment_rejected || current.status === 'cancelled' || current.status === 'failed') state = 'cancelled';
    else if (current.provider_payment_id || await paysOnDelivery(target, current)) state = 'paid';
    res.setHeader('Cache-Control', 'no-store');
    canResumeUpiIntent = canResumeUpiIntent && state === 'pending' && current.status === 'placed'
      && Number.isFinite(Date.parse(current.reservation_expires_at)) && Date.parse(current.reservation_expires_at) > Date.now();
    res.json({ target: target.target, state, record: current, canResumeUpiIntent });
  } catch (error) { next(error); }
}
export async function getPendingPayments(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const [orders, legs] = await Promise.all([
      supabase.from('orders').select('id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('provider_payment_id', null).is('trip_id', null).gt('reservation_expires_at', new Date().toISOString()).order('placed_at', { ascending: false }).limit(20),
      supabase.from('orders').select('trip_id,placed_at').eq('customer_id', req.user!.id).eq('payment_method', 'online').eq('status', 'placed')
        .is('provider_payment_id', null).not('trip_id', 'is', null).gt('reservation_expires_at', new Date().toISOString()).order('placed_at', { ascending: false }).limit(40),
    ]);
    if (orders.error) throw orders.error;
    if (legs.error) throw legs.error;
    const targets = [...(orders.data ?? []).map((order) => ({ target: { orderId: order.id }, at: order.placed_at })),
      ...[...new Map((legs.data ?? []).map((leg) => [leg.trip_id, leg])).values()].map((leg) => ({ target: { tripId: leg.trip_id }, at: leg.placed_at }))]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    res.setHeader('Cache-Control', 'no-store'); res.json(targets.map((row) => row.target));
  } catch (error) { next(error); }
}
