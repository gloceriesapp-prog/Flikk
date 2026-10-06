// Manual refund approval records a durable intent; the backend worker owns provider calls.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { failedDeliveryRefundEligibility } from '@/lib/refunds/failedDeliveryRefund';

export async function POST(_req: Request, ctx: RouteContext<'/api/failed-deliveries/[id]/refund'>) {
  const user = await requireAdminSession();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, status, refund_status, razorpay_payment_id')
      .eq('id', id)
      .single();
    if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    // UI eligibility plus the transactional RPC protect repeated approvals.
    const eligibility = failedDeliveryRefundEligibility({
      status: order.status,
      refundStatus: order.refund_status,
      razorpayPaymentId: order.razorpay_payment_id,
    });
    if (!eligibility.ok) return NextResponse.json({ error: eligibility.error }, { status: eligibility.httpStatus });

    const { error: queueError } = await supabaseAdmin.rpc('request_order_refund',{p_order:id});
    if(queueError) throw queueError;
    return NextResponse.json({refundStatus:'processing'});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not issue refund.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
