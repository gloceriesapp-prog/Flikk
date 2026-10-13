import { supabase } from '../db/supabase.js';
import { RazorpayError, createProviderRefund, getPaymentRefunds, getProviderPayment, toPaise, type RazorpayRefund } from './razorpayClient.js';

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

export async function listRefunds(paymentId: string): Promise<ProviderRefund[]> {
  return [...new Map((await getPaymentRefunds(paymentId)).map(normalizeRefund).map(refund => [refund.id, refund])).values()];
}
export async function createOrAdoptRefund(paymentId: string, requestKey: string, amountPaise: number, note: string): Promise<ProviderRefund> {
  // Reuse the exact idempotency key and body even after timeout. Adopt by our
  // receipt/notes while storing Razorpay's actual rfnd_ ID for reconciliation.
  const existing = (await listRefunds(paymentId)).find(refund => refund.requestKey === requestKey);
  if (existing) {
    if (existing.amount !== amountPaise) throw new Error('Provider refund mismatch');
    return existing;
  }
  const created = normalizeRefund(await createProviderRefund(paymentId, { requestKey, amountPaise, note }));
  if (created.requestKey !== requestKey || created.amount !== amountPaise) throw new Error('Provider refund mismatch');
  return created;
}
export type RefundSource = { provider: 'razorpay'; paymentId: string } | { provider: 'legacy' };
export async function refundSource(kind: 'order' | 'trip', targetId: string, capturedPaymentId: string): Promise<RefundSource> {
  const [{ data: record, error }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from(kind === 'trip' ? 'trips' : 'orders').select('payment_provider,provider_payment_id,total').eq('id', targetId).maybeSingle(),
    supabase.from('checkout_payment_sessions').select('payment_provider,provider_order_id').eq('kind', kind).eq('target_id', targetId).maybeSingle(),
  ]);
  if (error || sessionError) throw error ?? sessionError;
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
export const LEGACY_REFUND_NOTE = 'Historic or unidentified payment provider: refund manually through the original provider';
export function isDefinitiveRejection(error: unknown) { return error instanceof RazorpayError && [400, 404, 422].includes(error.providerStatus); }
