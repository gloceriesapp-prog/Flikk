// Admin reassign — admin_reassign_rider (migration 109). Pre-pickup only.
// Every live leg moves to the new rider under the trip lock, so a trip keeps
// exactly one rider. riderId is riders.id (what /api/riders lists).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notification';
import { sendPushNotification } from '@/lib/pushNotification';
import { adminReason, adminRpcErrorResponse, isUuid, requireAdminActor } from '@/lib/orders/adminActor';

export async function POST(request: Request, ctx: RouteContext<'/api/orders/[id]/reassign-rider'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { riderId?: unknown; reason?: unknown } | null;
  if (!isUuid(body?.riderId)) return NextResponse.json({ error: 'Pick a rider first.' }, { status: 400 });
  const reason = adminReason(body.reason);
  if (!reason) return NextResponse.json({ error: 'Enter a reason (3-300 characters).' }, { status: 400 });

  try {
    const { data: rider, error: riderError } = await supabaseAdmin
      .from('riders')
      .select('user_id, users!inner(expo_push_token)')
      .eq('id', body.riderId)
      .maybeSingle();
    if (riderError) throw riderError;
    if (!rider) return NextResponse.json({ error: 'That rider is not an approved, active rider.' }, { status: 400 });

    const { data, error } = await supabaseAdmin.rpc('admin_reassign_rider', {
      p_order: id, p_rider: rider.user_id, p_reason: reason, p_admin_email: actor.email,
    });
    if (error) {
      const mapped = adminRpcErrorResponse(error);
      if (mapped) return mapped;
      throw error;
    }
    const result = data as { order_ids: string[]; previous_rider_id: string; trip_id: string | null };
    const message = result.trip_id && result.order_ids.length > 1
      ? `A ${result.order_ids.length}-stop pickup is ready for you.`
      : `Order ${id.slice(0, 6).toUpperCase()} is ready for pickup.`;
    const token = (rider.users as unknown as { expo_push_token: string | null } | null)?.expo_push_token ?? null;
    void sendPushNotification(token, 'New delivery assigned', message);
    void createNotification({ userId: rider.user_id, title: 'New delivery assigned', body: message, type: 'assignment', orderId: result.trip_id ? null : id });
    void createNotification({
      userId: result.previous_rider_id,
      title: 'Delivery reassigned',
      body: 'An order was moved to another rider by Gloceries support.',
      type: 'general',
      orderId: result.trip_id ? null : id,
    });
    return NextResponse.json({ orderIds: result.order_ids });
  } catch (err) {
    console.error('Admin reassign failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not reassign the rider. Please try again.' }, { status: 500 });
  }
}
