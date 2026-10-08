// Manual retry queues the existing durable refund job after admin authorization.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, trip_id, total, refund_status, provider_payment_id')
      .eq('id', id)
      .single();
    if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (!order.provider_payment_id) {
      return NextResponse.json({ error: 'This order has no online payment to refund.' }, { status: 400 });
    }
    if (order.refund_status !== 'failed') {
      return NextResponse.json({ error: `Refund is already '${order.refund_status}' — nothing to retry.` }, { status: 400 });
    }

    // Shared payments are reconciled through the combined refund worker.
    // A gross shop subtotal must never start a competing refund.
    if (order.trip_id) {
      return NextResponse.json({ error: 'This is a shared trip payment. Use Trip refunds on the Refunds page: a rejected trip refund is closed with "Mark refunded manually".' }, { status: 409 });
    }

    const { error: retryError } = await supabaseAdmin.rpc('request_order_refund',{p_order:id});
    if(retryError) throw retryError;
    return NextResponse.json({refundStatus:'processing'});
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not retry refund.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
