// Shared Cashfree refund mechanics for the durable refund workers
// (orderRefunds.ts, tripRefunds.ts). API routes and the admin app only
// enqueue database intents; only these workers move money.
//
// Idempotency: every refund request carries a deterministic refund_id
// (cashfreeRefundId) that is also the x-idempotency-key. Before creating,
// the order's refunds are listed and a refund with our id is ADOPTED instead
// of re-requested — a lost response can never refund twice.
import { supabase } from '../db/supabase.js';
import { CashfreeError, cashfreeOrderId, createCfRefund, getCfRefunds, toPaise, type CfRefund } from './cashfreeClient.js';

export type RefundState = 'processing' | 'completed' | 'failed';
export interface ProviderRefund { id: string; amount: number; status: RefundState }

// SUCCESS moved money; CANCELLED/REJECTED moved none (never count them as
// "already refunded"); everything else is still in flight and reserves money.
export function mapRefundStatus(status: string): RefundState {
  if (status === 'SUCCESS') return 'completed';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'failed';
  return 'processing';
}
export function normalizeRefund(refund: CfRefund): ProviderRefund {
  const amount = toPaise(refund.refund_amount);
  if (!refund.refund_id || amount <= 0) throw new Error('Invalid provider refund');
  return { id: refund.refund_id, amount, status: mapRefundStatus(String(refund.refund_status)) };
}
export function refundProgress(items: ProviderRefund[], target: number) {
  const reserved = items.filter(r => r.status !== 'failed').reduce((n, r) => n + r.amount, 0);
  const completed = items.filter(r => r.status === 'completed').reduce((n, r) => n + r.amount, 0);
  return { remaining: Math.max(0, target - reserved), completed, settled: completed >= target };
}

export async function listRefunds(providerOrderId: string): Promise<ProviderRefund[]> {
  return [...new Map((await getCfRefunds(providerOrderId)).map(normalizeRefund).map(r => [r.id, r])).values()];
}
// Create, or adopt an existing refund with the same id (concurrent worker /
// lost response that the earlier list missed).
export async function createOrAdoptRefund(providerOrderId: string, refundId: string, amountPaise: number, note: string): Promise<ProviderRefund> {
  try {
    const created = normalizeRefund(await createCfRefund(providerOrderId, { refundId, amountPaise, note }));
    if (created.id !== refundId || created.amount !== amountPaise) throw new Error('Provider refund mismatch');
    return created;
  } catch (error) {
    if (error instanceof CashfreeError && (error.providerStatus === 409 || error.providerStatus === 400)) {
      const adopted = (await listRefunds(providerOrderId)).find(r => r.id === refundId);
      if (adopted) return adopted;
    }
    throw error;
  }
}

// Which Cashfree order a refund belongs to. Legacy Razorpay-paid rows are
// never sent to Cashfree: the worker flags them manual_required for admin.
export type RefundSource = { provider: 'cashfree'; providerOrderId: string } | { provider: 'legacy' };
export async function refundSource(kind: 'order' | 'trip', targetId: string): Promise<RefundSource> {
  const [{ data: record, error }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from(kind === 'trip' ? 'trips' : 'orders').select('payment_provider').eq('id', targetId).maybeSingle(),
    supabase.from('checkout_payment_sessions').select('provider_order_id').eq('kind', kind).eq('target_id', targetId).maybeSingle(),
  ]);
  if (error || sessionError) throw error ?? sessionError;
  const stored = session?.provider_order_id as string | null | undefined;
  if (record?.payment_provider === 'razorpay' || (stored && stored !== cashfreeOrderId(targetId))) return { provider: 'legacy' };
  return { provider: 'cashfree', providerOrderId: cashfreeOrderId(targetId) };
}
export const LEGACY_REFUND_NOTE = 'Legacy Razorpay payment: refund manually';
export function isDefinitiveRejection(error: unknown) {
  return error instanceof CashfreeError && [400, 401, 403, 404, 422].includes(error.providerStatus);
}
