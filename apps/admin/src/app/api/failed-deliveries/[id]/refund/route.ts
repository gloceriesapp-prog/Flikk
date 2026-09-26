// Issue the manual refund for a failed-delivery order. Reuses retryRefund()
// from lib/razorpay/refund.ts — despite its name it's the shared idempotent
// "refund this payment, unless Razorpay already has one" primitive (it checks
// findExistingRefund() before ever creating a new refund), so it is the same
// money-safe call the Refunds tab uses, not a hand-rolled second integration.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { retryRefund } from '@/lib/razorpay/refund';
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

    // Double-refund guard (see failedDeliveryRefund.ts): blocks anything not a
    // still-unrefunded failed delivery. Second money guard is retryRefund's own
    // Razorpay-side idempotency, which no-ops an already-refunded payment.
    const eligibility = failedDeliveryRefundEligibility({
      status: order.status,
      refundStatus: order.refund_status,
      razorpayPaymentId: order.razorpay_payment_id,
    });
    if (!eligibility.ok) return NextResponse.json({ error: eligibility.error }, { status: eligibility.httpStatus });

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
    const message = err instanceof Error ? err.message : 'Could not issue refund.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
