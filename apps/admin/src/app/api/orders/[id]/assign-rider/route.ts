// Manual rider assignment — the real fallback when automated dispatch
// (backend lib/riderDispatch.ts) finds nobody. Same guarded write as backend
// PATCH /admin/orders/:id/assign-rider: the UPDATE itself filters on
// status='packed' AND rider_id IS NULL, so it can never steal an order a
// rider just accepted. For a multi-store trip, every still-unassigned packed
// leg goes to the same rider (legs not packed yet are left for dispatch).

import { NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushNotification';
import { createNotification } from '@/lib/notification';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { riderId?: unknown } | null;
  if (typeof body?.riderId !== 'string' || !body.riderId) {
    return NextResponse.json({ error: 'Pick a rider first.' }, { status: 400 });
  }

  try {
    // riderId is riders.id (what /api/riders lists); orders.rider_id is the user id.
    const { data: rider, error: riderError } = await supabaseAdmin
      .from('riders')
      .select('user_id, is_active, users!inner(role, is_approved, expo_push_token)')
      .eq('id', body.riderId)
      .maybeSingle();
    if (riderError) throw riderError;
    const account = (rider?.users ?? null) as unknown as { role: string; is_approved: boolean; expo_push_token: string | null } | null;
    if (!rider || !rider.is_active || account?.role !== 'rider' || !account.is_approved) {
      return NextResponse.json({ error: 'That rider is not an approved, active rider.' }, { status: 409 });
    }

    const { data: order, error: orderError } = await supabaseAdmin.from('orders').select('id, trip_id').eq('id', id).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    const update = supabaseAdmin.from('orders').update({ rider_id: rider.user_id }).eq('status', 'packed').is('rider_id', null);
    const { data: assigned, error } = await (order.trip_id ? update.eq('trip_id', order.trip_id) : update.eq('id', id)).select('id');
    if (error) throw error;
    if (!assigned || assigned.length === 0) {
      return NextResponse.json({ error: 'Order is no longer packed or already has a rider.' }, { status: 409 });
    }

    const message = order.trip_id && assigned.length > 1
      ? `A ${assigned.length}-stop pickup is ready for you.`
      : `Order ${id.slice(0, 6).toUpperCase()} is ready for pickup.`;
    void sendPushNotification(account.expo_push_token, 'New delivery assigned', message);
    void createNotification({ userId: rider.user_id, title: 'New delivery assigned', body: message, type: 'assignment', orderId: order.trip_id ? null : id });

    return NextResponse.json({ assignedOrderIds: assigned.map((row) => row.id) });
  } catch (err) {
    console.error('Manual rider assignment failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not assign the rider. Please try again.' }, { status: 500 });
  }
}
