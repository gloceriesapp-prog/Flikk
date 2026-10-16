import crypto from 'node:crypto';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { createProviderUpiIntent, getOrderPayments, requireLiveUpiIntent, type RazorpayPayment } from './razorpayClient.js';
import { ensureProviderOrder, paymentTarget, reconcileProvider, type Target } from './recovery.js';
import { isValidUpiIntentUrl } from './upiIntentUrl.js';
import { readPaymentEmail } from './contact.js';

interface IntentSession { upi_state: 'creating' | 'ready' | null; upi_payment_id: string | null; upi_link: string | null; }
interface IntentClaim { claimed: boolean; session: IntentSession; expiresAt: string; }

function checkedPayments(payments: RazorpayPayment[], orderId: string, amount: number) {
  if (payments.some(payment => payment.order_id !== orderId || payment.currency !== 'INR' || payment.amount !== amount))
    throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Payment records need support review.');
  return payments;
}
async function claimIntent(target: Target, customerId: string, orderId: string, token: string, replaceId?: string): Promise<IntentClaim> {
  const { data, error } = await supabase.rpc('claim_checkout_upi_intent', {
    p_customer_id: customerId, p_kind: target.kind, p_target_id: target.id,
    p_provider_order_id: orderId, p_claim_token: token, p_replace_payment_id: replaceId ?? null,
  });
  if (error?.code === 'P0403') throw new AppError(403, 'FORBIDDEN', 'Not your checkout.');
  if (error?.code === 'P0410') throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout is paid, expired or cancelled.');
  if (error || !data) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'UPI payment recovery is unavailable. Please retry shortly.');
  return data as IntentClaim;
}
function intentResponse(orderId: string, paymentId: unknown, link: unknown, amount: number, expiresAt: string) {
  if (typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || !isValidUpiIntentUrl(link, amount))
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider returned an invalid UPI instruction. Please retry shortly.');
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
    throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This checkout has expired.');
  return { provider: 'razorpay', providerOrderId: orderId, providerPaymentId: paymentId,
    intentUrl: link, amountPaise: amount, currency: 'INR', expiresAt };
}

// The caller supplies only the local target. Price, identity, payee and UPI URI
// come from trusted backend/provider state, never arbitrary customer URL fields.
export async function createUpiIntent(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    // Check before creating a provider order or reserving a durable intent.
    requireLiveUpiIntent();
    const target = paymentTarget(req.body ?? {});
    const customerId = req.user!.id;
    const order = await ensureProviderOrder(target, customerId);
    let payments = checkedPayments(await getOrderPayments(order.id), order.id, order.amount);
    if (payments.some(payment => payment.captured || payment.status === 'authorized')) {
      await reconcileProvider(target, order.id, order.amount / 100);
      throw new AppError(409, 'PAYMENT_RECONCILING', 'Your payment is being confirmed. Please wait before paying again.');
    }
    if (payments.some(payment => payment.status !== 'failed')) {
      const { data: existing, error: existingError } = await supabase.from('checkout_payment_sessions')
        .select('upi_state,upi_payment_id').eq('kind', target.kind).eq('target_id', target.id).maybeSingle();
      if (existingError) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Could not recover your UPI request.');
      // A pending SDK payment is not our reusable S2S instruction. Avoid
      // claiming a new intent while another payment flow remains unresolved.
      if (existing?.upi_state !== 'ready' || payments.some(payment => payment.status !== 'failed' && payment.id !== existing.upi_payment_id))
        throw new AppError(409, 'PAYMENT_RECONCILING', 'Your previous payment is being confirmed. Please wait before paying again.');
    }
    // Validate customer data before claiming a non-idempotent provider request.
    // Correcting a missing profile field must not strand the checkout claim.
    const { data: customer, error: customerError } = await supabase.from('users').select('phone').eq('id', customerId).single();
    if (customerError || !customer) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Could not load your payment details.');
    const email = await readPaymentEmail(customerId);
    const contact = typeof customer.phone === 'string' ? customer.phone.replace(/^\+/, '') : '';
    if (!email)
      throw new AppError(409, 'PAYMENT_EMAIL_REQUIRED', 'Add your email address for the payment receipt to pay with UPI.');
    if (!/^\d{10,15}$/.test(contact))
      throw new AppError(409, 'PAYMENT_CONTACT_REQUIRED', 'Add a valid phone number in Profile to pay with UPI.');
    const token = crypto.randomUUID();
    let claim = await claimIntent(target, customerId, order.id, token);
    if (!claim.claimed && claim.session.upi_state === 'ready') {
      const current = payments.find(payment => payment.id === claim.session.upi_payment_id);
      if (current?.status === 'failed') {
        // Failed is terminal at Razorpay. The RPC compares the exact old ID
        // under lock before permitting one replacement, even across replicas.
        claim = await claimIntent(target, customerId, order.id, token, current.id);
      } else if (current?.status === 'created') {
        res.setHeader('Cache-Control', 'no-store');
        return res.json(intentResponse(order.id, claim.session.upi_payment_id, claim.session.upi_link, order.amount, claim.expiresAt));
      } else {
        throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous UPI payment. Please retry shortly.');
      }
    }
    if (!claim.claimed) throw new AppError(409, 'PAYMENT_RECONCILING', 'We are checking your previous UPI request. Please retry shortly.');
    // Recheck after obtaining the durable claim, before the only external POST.
    // Unknown outcomes intentionally keep this claim, preventing duplicate money.
    payments = checkedPayments(await getOrderPayments(order.id), order.id, order.amount);
    if (payments.some(payment => payment.status !== 'failed'))
      throw new AppError(409, 'PAYMENT_RECONCILING', 'A previous payment is still being confirmed.');
    const notes: Record<string, string> = target.kind === 'trip' ? { gloceries_trip_id: target.id } : { gloceries_order_id: target.id };
    const intent = await createProviderUpiIntent({ providerOrderId: order.id, amountPaise: order.amount, email, contact,
      notes, ip: req.ip, userAgent: req.get('user-agent')?.slice(0, 1024) });
    if (!/^pay_[A-Za-z0-9]+$/.test(intent.razorpay_payment_id) || !isValidUpiIntentUrl(intent.link, order.amount))
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider returned an invalid UPI instruction.');
    const { error: attachError } = await supabase.rpc('attach_checkout_upi_intent', {
      p_kind: target.kind, p_target_id: target.id, p_provider_order_id: order.id, p_claim_token: token,
      p_payment_id: intent.razorpay_payment_id, p_link: intent.link,
    });
    if (attachError) throw new AppError(503, 'PAYMENT_RECOVERY_UNAVAILABLE', 'Your UPI request is being recovered. Please retry shortly.');
    res.setHeader('Cache-Control', 'no-store');
    res.json(intentResponse(order.id, intent.razorpay_payment_id, intent.link, order.amount, claim.expiresAt));
  } catch (error) { next(error); }
}
