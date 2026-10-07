// Real refund visibility for the founder — every order whose refund_status is
// anything other than 'none'. Ordered by what needs a human first:
// manual_required (legacy-provider payment the system can't refund through
// Cashfree), failed, processing, completed. Admin only reads here; the
// backend refund worker is the single place that talks to Cashfree.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import type { PaymentProvider, RefundStatus } from '@/lib/types';

export interface RefundOrder {
  id: string;
  orderNumber: string;
  total: number;
  refundStatus: Exclude<RefundStatus, 'none'>;
  paymentProvider: PaymentProvider;
  // Cashfree order id (gl_<checkout session>) from checkout_payment_sessions.
  providerOrderId: string | null;
  providerPaymentId: string | null;
  // For a manual refund this holds the bank/UPI reference the founder entered.
  providerRefundId: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
}

const STATUS_RANK: Record<RefundOrder['refundStatus'], number> = { manual_required: 0, failed: 1, processing: 2, completed: 3 };

export async function GET() {
  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, total, refund_status, payment_provider, provider_payment_id, provider_refund_id, cancel_reason, refunded_at')
      .neq('refund_status', 'none')
      .order('placed_at', { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const ids = rows.map((r) => r.id);
    const { data: sessions, error: sessionsErr } = ids.length
      ? await supabaseAdmin.from('checkout_payment_sessions').select('target_id, provider_order_id').eq('kind', 'order').in('target_id', ids)
      : { data: [], error: null };
    if (sessionsErr) throw sessionsErr;
    const providerOrderIds = new Map((sessions ?? []).map((s) => [s.target_id, s.provider_order_id as string | null]));

    const refunds: RefundOrder[] = rows
      .map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        total: row.total,
        refundStatus: row.refund_status as RefundOrder['refundStatus'],
        paymentProvider: (row.payment_provider ?? 'cashfree') as PaymentProvider,
        providerOrderId: providerOrderIds.get(row.id) ?? null,
        providerPaymentId: row.provider_payment_id,
        providerRefundId: row.provider_refund_id,
        cancelReason: row.cancel_reason,
        refundedAt: row.refunded_at,
      }))
      .sort((a, b) => (STATUS_RANK[a.refundStatus] ?? 9) - (STATUS_RANK[b.refundStatus] ?? 9));

    return NextResponse.json(refunds);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load refunds.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
