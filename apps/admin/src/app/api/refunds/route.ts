// Real refund visibility for the founder — every order whose
// refund_status is anything other than 'none' (a cancelled order that
// was actually paid online — backend/src/routes/orders.ts's own cancel
// handler is the only writer of this column). Ordered failed-first, then
// processing, then completed — a founder opening this tab cares most
// about what's actually broken right now.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';

export interface RefundOrder {
  id: string;
  orderNumber: string;
  total: number;
  refundStatus: 'processing' | 'completed' | 'failed';
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
}

const STATUS_RANK: Record<string, number> = { failed: 0, processing: 1, completed: 2 };

export async function GET() {
  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, total, refund_status, razorpay_payment_id, razorpay_refund_id, cancel_reason, refunded_at')
      .neq('refund_status', 'none')
      .order('placed_at', { ascending: false });
    if (error) throw error;

    const refunds: RefundOrder[] = (data ?? [])
      .map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        total: row.total,
        refundStatus: row.refund_status as RefundOrder['refundStatus'],
        razorpayPaymentId: row.razorpay_payment_id,
        razorpayRefundId: row.razorpay_refund_id,
        cancelReason: row.cancel_reason,
        refundedAt: row.refunded_at,
      }))
      .sort((a, b) => STATUS_RANK[a.refundStatus] - STATUS_RANK[b.refundStatus]);

    return NextResponse.json(refunds);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load refunds.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
