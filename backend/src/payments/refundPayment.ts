import { supabase } from '../db/supabase.js';
import { RazorpayError, createProviderRefund, getPaymentRefunds, getProviderPayment, toPaise, type RazorpayRefund } from './razorpayClient.js';
import { CASHFREE_ORDER_ID, CASHFREE_PAYMENT_ID, CashfreeError, cashfreeRefundId, createCfRefund, getCfOrderPayments, getCfRefunds, paiseFromRupees, type CfRefund } from './cashfreeClient.js';

export type RefundState = 'processing' | 'completed' | 'failed';
export interface ProviderRefund { id: string; requestKey?: string; amount: number; status: RefundState }

// Processed refunds moved money; failed refunds reserve none. Pending
// refunds reserve their amount until the provider confirms the outcome.
export function mapRefundStatus(status: string): RefundState {
  if (status === 'processed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'processing';
}
export function normalizeRefund(refund: RazorpayRefund): ProviderRefund {
  if (!refund.id || !Number.isSafeInteger(refund.amount) || refund.amount <= 0) throw new Error('Invalid provider refund');
  return { id: refund.id, requestKey: refund.notes?.gloceries_refund_key ?? refund.receipt, amount: refund.amount, status: mapRefundStatus(refund.status) };
}
export function refundProgress(items: ProviderRefund[], target: number) {
  const reserved = items.filter(r => r.status !== 'failed').reduce((n, r) => n + r.amount, 0);
  const completed = items.filter(r => r.status === 'completed').reduce((n, r) => n + r.amount, 0);
  return { remaining: Math.max(0, target - reserved), completed, settled: completed >= target };
}

// Cashfree: SUCCESS moved money; CANCELLED/REJECTED reserve none; anything
// else (PENDING, PENDING_APPROVAL, ONHOLD) is still in flight.
export function normalizeCashfreeRefund(refund: CfRefund): ProviderRefund {
  const amount = paiseFromRupees(refund.refund_amount);
  if (!refund.refund_id || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid provider refund');
  const status: RefundState = refund.refund_status === 'SUCCESS' ? 'completed'
    : refund.refund_status === 'CANCELLED' || refund.refund_status === 'REJECTED' ? 'failed' : 'processing';
  return { id: String(refund.cf_refund_id ?? refund.refund_id), requestKey: refund.refund_id, amount, status };
}
export type RefundSource = { provider: 'razorpay'; paymentId: string } | { provider: 'cashfree'; paymentId: string; providerOrderId: string } | { provider: 'legacy' };
type LiveSource = Exclude<RefundSource, { provider: 'legacy' }>;
// The idempotency key each provider sees for one of our refund requests.
export function providerRefundKey(source: LiveSource, requestKey: string) {
  return source.provider === 'cashfree' ? cashfreeRefundId(requestKey) : requestKey;
}
export async function listRefunds(source: LiveSource): Promise<ProviderRefund[]> {
  const refunds = source.provider === 'cashfree'
    ? (await getCfRefunds(source.providerOrderId)).filter(refund => typeof refund.cf_payment_id !== 'string' || refund.cf_payment_id === source.paymentId).map(normalizeCashfreeRefund)
    : (await getPaymentRefunds(source.paymentId)).map(normalizeRefund);
  return [...new Map(refunds.map(refund => [refund.id, refund])).values()];
}
export async function createOrAdoptRefund(source: LiveSource, requestKey: string, amountPaise: number, note: string): Promise<ProviderRefund> {
  // Reuse the exact idempotency key and body even after timeout. Adopt by our
  // own key while storing the provider's actual refund ID for reconciliation.
  const key = providerRefundKey(source, requestKey);
  const existing = (await listRefunds(source)).find(refund => refund.requestKey === key);
  if (existing) {
    if (existing.amount !== amountPaise) throw new Error('Provider refund mismatch');
    return existing;
  }
  const created = source.provider === 'cashfree'
    ? normalizeCashfreeRefund(await createCfRefund(source.providerOrderId, { refundId: key, amountPaise, note }))
    : normalizeRefund(await createProviderRefund(source.paymentId, { requestKey: key, amountPaise, note }));
  if (created.requestKey !== key || created.amount !== amountPaise) throw new Error('Provider refund mismatch');
  return created;
}
export async function refundSource(kind: 'order' | 'trip', targetId: string, capturedPaymentId: string): Promise<RefundSource> {
  const [{ data: record, error }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from(kind === 'trip' ? 'trips' : 'orders').select('payment_provider,provider_payment_id,total').eq('id', targetId).maybeSingle(),
    supabase.from('checkout_payment_sessions').select('payment_provider,provider_order_id').eq('kind', kind).eq('target_id', targetId).maybeSingle(),
  ]);
  if (error || sessionError) throw error ?? sessionError;
  if (record?.payment_provider === 'cashfree' && session?.payment_provider === 'cashfree' && session.provider_order_id)
    return cashfreeRefundSource(record, session.provider_order_id, capturedPaymentId);
  if (record?.payment_provider !== 'razorpay' || session?.payment_provider !== 'razorpay' || !session.provider_order_id
    || !/^pay_[A-Za-z0-9]+$/.test(capturedPaymentId) || (record.provider_payment_id && record.provider_payment_id !== capturedPaymentId)) return { provider: 'legacy' };
  // A checkout switched to COD deliberately has no canonical online payment.
  // Its durable refund job owns the late capture; verify that capture against
  // the attached provider order rather than marking it a historic payment.
  const payment = await getProviderPayment(capturedPaymentId);
  if (payment.id !== capturedPaymentId || payment.order_id !== session.provider_order_id || payment.currency !== 'INR'
    || payment.amount !== toPaise(record.total) || payment.captured !== true || !['captured', 'refunded'].includes(payment.status)) return { provider: 'legacy' };
  return { provider: 'razorpay', paymentId: capturedPaymentId };
}
// A Cashfree payment refunds only through Cashfree, and only when a server
// read proves it is this checkout's SUCCESS payment for the full amount.
async function cashfreeRefundSource(record: { provider_payment_id: string | null; total: number | string }, providerOrderId: string, paymentId: string): Promise<RefundSource> {
  if (!CASHFREE_ORDER_ID.test(providerOrderId) || !CASHFREE_PAYMENT_ID.test(paymentId)
    || (record.provider_payment_id && record.provider_payment_id !== paymentId)) return { provider: 'legacy' };
  const payment = (await getCfOrderPayments(providerOrderId)).find(item => item.cf_payment_id === paymentId);
  if (!payment || payment.order_id !== providerOrderId || payment.payment_currency !== 'INR'
    || paiseFromRupees(payment.payment_amount) !== toPaise(record.total) || payment.payment_status !== 'SUCCESS') return { provider: 'legacy' };
  return { provider: 'cashfree', paymentId, providerOrderId };
}
export const LEGACY_REFUND_NOTE = 'Historic or unidentified payment provider: refund manually through the original provider';
// A documented low-balance rejection can recover when merchant funds arrive.
// Keep the frozen request/idempotency key; never rotate it for a retry.
export function isDefinitiveRejection(error: unknown) {
  if (error instanceof CashfreeError) return [400, 404, 422].includes(error.providerStatus);
  return error instanceof RazorpayError && [400, 404, 422].includes(error.providerStatus)
    && !(error.providerStatus === 400 && error.providerReason === 'insufficient_balance');
}
