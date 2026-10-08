// Manual refund approval records a durable intent; the backend worker owns provider calls.
// - Single order: request_order_refund (order_refund_jobs).
// - Trip leg: request_order_refund refuses shared trip payments, so the trip
//   is refunded once via admin_approve_trip_failure_refund (migration 109) ->
//   approve_failed_trip_refund, the same function as backend
//   POST /admin/trips/:id/failure-refund. Body { amountPaise } (defaults to the
//   full trip total); the amount is frozen on the first approval.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { failedDeliveryRefundEligibility } from '@/lib/refunds/failedDeliveryRefund';
import { adminRpcErrorResponse, isUuid, requireAdminActor } from '@/lib/orders/adminActor';

export async function POST(req: Request, ctx: RouteContext<'/api/failed-deliveries/[id]/refund'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { amountPaise?: unknown } | null;

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, trip_id, total, status, refund_status, provider_payment_id')
      .eq('id', id)
      .single();
    if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    if (order.trip_id) {
      const { data: trip, error: tripError } = await supabaseAdmin.from('trips').select('total, provider_payment_id').eq('id', order.trip_id).single();
      if (tripError || !trip) throw tripError ?? new Error('Trip missing');
      const eligibility = failedDeliveryRefundEligibility({ status: order.status, refundStatus: order.refund_status, providerPaymentId: trip.provider_payment_id });
      if (!eligibility.ok) return NextResponse.json({ error: eligibility.error }, { status: eligibility.httpStatus });
      const fullPaise = Math.round(Number(trip.total) * 100);
      const amount = body?.amountPaise === undefined ? fullPaise : body.amountPaise;
      if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > fullPaise) {
        return NextResponse.json({ error: `Enter a refund between ₹0.01 and the trip total (₹${(fullPaise / 100).toFixed(2)}).` }, { status: 400 });
      }
      const { error: rpcError } = await supabaseAdmin.rpc('admin_approve_trip_failure_refund', { p_order: id, p_amount_paise: amount, p_admin_email: actor.email });
      if (rpcError) {
        const mapped = adminRpcErrorResponse(rpcError);
        if (mapped) return mapped;
        throw rpcError;
      }
      return NextResponse.json({ refundStatus: 'processing', tripId: order.trip_id, amountPaise: amount });
    }

    // UI eligibility plus the transactional RPC protect repeated approvals.
    const eligibility = failedDeliveryRefundEligibility({
      status: order.status,
      refundStatus: order.refund_status,
      providerPaymentId: order.provider_payment_id,
    });
    if (!eligibility.ok) return NextResponse.json({ error: eligibility.error }, { status: eligibility.httpStatus });

    const { error: queueError } = await supabaseAdmin.rpc('request_order_refund', { p_order: id });
    if (queueError) throw queueError;
    return NextResponse.json({ refundStatus: 'processing' });
  } catch (err) {
    console.error('Failed-delivery refund failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not issue the refund. Please try again.' }, { status: 500 });
  }
}
