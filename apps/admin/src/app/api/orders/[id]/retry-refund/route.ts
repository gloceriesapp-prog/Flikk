// Manual retry for a refund that failed on its first attempt — only ever
// meaningful when refund_status is actually 'failed' (retryRefund's own
// idempotency check would otherwise just re-confirm an already-completed
// refund, which is harmless but pointless to expose as a button for).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { retryRefund } from '@/lib/razorpay/refund';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await params;

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, refund_status, razorpay_payment_id')
      .eq('id', id)
      .single();
    if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (!order.razorpay_payment_id) {
      return NextResponse.json({ error: 'This order has no online payment to refund.' }, { status: 400 });
    }
    if (order.refund_status !== 'failed') {
      return NextResponse.json({ error: `Refund is already '${order.refund_status}' — nothing to retry.` }, { status: 400 });
    }

    const result = await retryRefund(order.razorpay_payment_id, order.total);

    const update: Record<string, unknown> = {
      refund_status: result.status,
      razorpay_refund_id: result.razorpayRefundId,
    };
    if (result.status === 'completed') update.refunded_at = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin.from('orders').update(update).eq('id', id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ refundStatus: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not retry refund.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
