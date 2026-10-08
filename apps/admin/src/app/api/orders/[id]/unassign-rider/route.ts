// Admin unassign — admin_unassign_rider (migration 109). Pre-pickup only.
// Clears the rider from every live leg (a trip never keeps half a rider) and
// resets dispatch so the worker offers the order to nearby riders again.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notification';
import { adminReason, adminRpcErrorResponse, isUuid, requireAdminActor } from '@/lib/orders/adminActor';

export async function POST(request: Request, ctx: RouteContext<'/api/orders/[id]/unassign-rider'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = adminReason(body?.reason);
  if (!reason) return NextResponse.json({ error: 'Enter a reason (3-300 characters).' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin.rpc('admin_unassign_rider', { p_order: id, p_reason: reason, p_admin_email: actor.email });
    if (error) {
      const mapped = adminRpcErrorResponse(error);
      if (mapped) return mapped;
      throw error;
    }
    const result = data as { order_ids: string[]; previous_rider_id: string; trip_id: string | null };
    void createNotification({
      userId: result.previous_rider_id,
      title: 'Delivery removed',
      body: 'An order was moved off your queue by Gloceries support.',
      type: 'general',
      orderId: result.trip_id ? null : id,
    });
    return NextResponse.json({ orderIds: result.order_ids });
  } catch (err) {
    console.error('Admin unassign failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not remove the rider. Please try again.' }, { status: 500 });
  }
}
