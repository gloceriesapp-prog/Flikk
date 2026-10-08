// Manual rider assignment — the real fallback when automated dispatch
// (backend lib/riderDispatch.ts) finds nobody. admin_assign_order_rider
// (migration 109) does the write and its audit row in one transaction:
// - a trip leg goes through assign_trip_rider (migration 107, the same RPC
//   as backend PATCH /admin/trips/:id/assign-rider): under the trip lock,
//   every unassigned live leg gets this rider, and a trip that already has
//   another rider is refused, so a trip can never be split across riders;
// - a single order keeps the guarded update (status='packed' AND
//   rider_id IS NULL), so it can never steal an order a rider just accepted.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';
import { createNotification } from '@/lib/notification';
import { isUuid, requireAdminActor, rpcErrorCode } from '@/lib/orders/adminActor';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { riderId?: unknown } | null;
  if (!isUuid(body?.riderId)) {
    return NextResponse.json({ error: 'Pick a rider first.' }, { status: 400 });
  }

  try {
    // riderId is riders.id (what /api/riders lists); orders.rider_id is the user id.
    const { data: rider, error: riderError } = await supabaseAdmin
      .from('riders')
      .select('user_id, users!inner(expo_push_token)')
      .eq('id', body.riderId)
      .maybeSingle();
    if (riderError) throw riderError;
    if (!rider) return NextResponse.json({ error: 'That rider is not an approved, active rider.' }, { status: 409 });
    const account = (rider.users ?? null) as unknown as { expo_push_token: string | null } | null;

    const { data, error } = await supabaseAdmin.rpc('admin_assign_order_rider', {
      p_order: id,
      p_rider: rider.user_id,
      p_admin_email: actor.email,
    });
    const code = rpcErrorCode(error);
    if (code === 'P0404') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (code === 'P0422') return NextResponse.json({ error: 'That rider is not an approved, active rider.' }, { status: 409 });
    if (code === 'P0409') return NextResponse.json({ error: 'Another rider already has this trip.' }, { status: 409 });
    // enforce_rider_capacity (migration 113): no admin override of the limit.
    if (code === 'P0429') {
      return NextResponse.json({ error: 'This rider already has the maximum number of active deliveries (Trips & dispatch settings).' }, { status: 409 });
    }
    if (error) throw error;
    const assigned = (data ?? []) as { id: string; trip_id: string | null }[];
    if (assigned.length === 0) {
      return NextResponse.json({ error: 'Order is no longer packed or already has a rider.' }, { status: 409 });
    }

    const tripId = assigned[0].trip_id;
    const message = tripId && assigned.length > 1
      ? `A ${assigned.length}-stop pickup is ready for you.`
      : `Order ${id.slice(0, 6).toUpperCase()} is ready for pickup.`;
    void sendPushNotification(account?.expo_push_token ?? null, 'New delivery assigned', message);
    void createNotification({ userId: rider.user_id, title: 'New delivery assigned', body: message, type: 'assignment', orderId: tripId ? null : id });

    return NextResponse.json({ assignedOrderIds: assigned.map((row) => row.id) });
  } catch (err) {
    console.error('Manual rider assignment failed', { code: rpcErrorCode(err) });
    return NextResponse.json({ error: 'Could not assign the rider. Please try again.' }, { status: 500 });
  }
}
