// Admin cancel — admin_cancel_order (migration 109). Same safe path the
// partner reject and customer cancel use: a single order gets the guarded
// status write whose triggers release stock, start the refund and notify the
// customer; a trip leg cancels the whole trip through cancel_trip_from_leg ->
// cancel_customer_trip (one combined refund). Placed/packed only; audited.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notification';
import { adminReason, adminRpcErrorResponse, isUuid, requireAdminActor } from '@/lib/orders/adminActor';

export async function POST(request: Request, ctx: RouteContext<'/api/orders/[id]/cancel'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = adminReason(body?.reason);
  if (!reason) return NextResponse.json({ error: 'Enter a reason (3-300 characters).' }, { status: 400 });

  try {
    // Riders holding the order are told it is gone (best effort, after commit).
    const { data: before } = await supabaseAdmin.from('orders').select('rider_id, trip_id').eq('id', id).maybeSingle();
    const { data, error } = await supabaseAdmin.rpc('admin_cancel_order', { p_order: id, p_reason: reason, p_admin_email: actor.email });
    if (error) {
      const mapped = adminRpcErrorResponse(error);
      if (mapped) return mapped;
      throw error;
    }
    const result = data as { cancelled_order_ids: string[]; trip_id: string | null };
    if (before?.rider_id) {
      void createNotification({
        userId: before.rider_id,
        title: 'Delivery cancelled',
        body: before.trip_id ? 'A multi-stop pickup assigned to you was cancelled.' : `Order ${id.slice(0, 6).toUpperCase()} was cancelled.`,
        type: 'general',
        orderId: before.trip_id ? null : id,
      });
    }
    return NextResponse.json({ cancelledOrderIds: result.cancelled_order_ids, tripId: result.trip_id });
  } catch (err) {
    console.error('Admin cancel failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not cancel the order. Please try again.' }, { status: 500 });
  }
}
