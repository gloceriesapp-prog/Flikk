// Failed-delivery manual-refund review — every order the rider marked 'failed'
// AFTER pickup (backend order state machine: out_for_delivery -> failed). The
// customer paid at checkout but is NOT auto-refunded; policy is case-by-case
// admin review, so this is the founder's queue for it. Service role, same
// rationale as sibling routes (orders has no admin-usable RLS read policy).
//
// Deliberately separate from /api/refunds: that route lists orders whose
// refund_status is already non-'none' and its 'failed' means "the provider
// refund failed" — a different meaning from a failed delivery. Once a refund
// IS issued here, the order's refund_status moves off 'none' and it also
// starts showing in the Refunds tab (where a failed refund gets its Retry and
// a 'manual_required' one gets "Mark refunded manually") — so no retry logic
// is duplicated here.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { deliveryFailureReasonLabel } from '@/lib/orders/deliveryFailureReasons';
import type { RefundStatus } from '@/lib/types';

export interface FailedDeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  storeName: string;
  amount: number;
  reasonCode: string | null;
  reasonLabel: string;
  placedAt: string;
  // No failed_at column exists (migration 052 added none): this is when the
  // 'failed' status change was logged (customer_notifications event), falling
  // back to the pickup time for orders older than that log.
  failedAt: string | null;
  riderName: string | null;
  riderPhone: string | null;
  // Multi-store trip: the refund is approved once for the whole trip
  // (approve_failed_trip_refund), up to the trip total.
  tripId: string | null;
  tripTotal: number | null;
  tripLegs: number;
  // 'none' => still refundable; anything else => a refund was already issued.
  refundStatus: RefundStatus;
  refundedAt: string | null;
}

interface FailedOrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  total: number;
  cancel_reason: string | null;
  placed_at: string;
  picked_up_at: string | null;
  rider_id: string | null;
  trip_id: string | null;
  refund_status: FailedDeliveryOrder['refundStatus'];
  refunded_at: string | null;
  stores: { name: string } | null;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_id, total, cancel_reason, placed_at, picked_up_at, rider_id, trip_id, refund_status, refunded_at, stores(name)')
      .eq('status', 'failed')
      .order('placed_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    const rows = (data ?? []) as unknown as FailedOrderRow[];

    // Resolve customer name/phone in one batch query — same two-step pattern as
    // app/api/customers/route.ts, avoids embedding ambiguity on orders' user FK.
    const customerIds = [...new Set(rows.map((r) => r.customer_id))];
    const { data: users, error: usersErr } = customerIds.length
      ? await supabaseAdmin.from('users').select('id, name, phone').in('id', customerIds)
      : { data: [], error: null };
    if (usersErr) throw usersErr;
    const byId = new Map((users ?? []).map((u) => [u.id, u]));

    const ids = rows.map((r) => r.id);
    const riderIds = [...new Set(rows.map((r) => r.rider_id).filter((v): v is string => !!v))];
    const tripIds = [...new Set(rows.map((r) => r.trip_id).filter((v): v is string => !!v))];
    const [eventsRes, ridersRes, tripsRes, legsRes] = await Promise.all([
      ids.length ? supabaseAdmin.from('customer_notifications').select('order_id, created_at').eq('event', 'failed').in('order_id', ids) : Promise.resolve({ data: [], error: null }),
      riderIds.length ? supabaseAdmin.from('riders').select('user_id, name, phone').in('user_id', riderIds) : Promise.resolve({ data: [], error: null }),
      tripIds.length ? supabaseAdmin.from('trips').select('id, total').in('id', tripIds) : Promise.resolve({ data: [], error: null }),
      tripIds.length ? supabaseAdmin.from('orders').select('trip_id').in('trip_id', tripIds) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const res of [eventsRes, ridersRes, tripsRes, legsRes]) if (res.error) throw res.error;
    const failedAt = new Map(((eventsRes.data ?? []) as { order_id: string; created_at: string }[]).map((e) => [e.order_id, e.created_at]));
    const riders = new Map(((ridersRes.data ?? []) as { user_id: string; name: string; phone: string }[]).map((r) => [r.user_id, r]));
    const tripTotals = new Map(((tripsRes.data ?? []) as { id: string; total: number }[]).map((t) => [t.id, Number(t.total)]));
    const legCounts = new Map<string, number>();
    for (const leg of (legsRes.data ?? []) as { trip_id: string }[]) legCounts.set(leg.trip_id, (legCounts.get(leg.trip_id) ?? 0) + 1);

    const orders: FailedDeliveryOrder[] = rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: byId.get(row.customer_id)?.name ?? 'Unknown',
      customerPhone: byId.get(row.customer_id)?.phone ?? '—',
      storeName: row.stores?.name ?? 'Unknown store',
      amount: Number(row.total),
      reasonCode: row.cancel_reason,
      reasonLabel: deliveryFailureReasonLabel(row.cancel_reason),
      placedAt: row.placed_at,
      failedAt: failedAt.get(row.id) ?? row.picked_up_at,
      riderName: row.rider_id ? riders.get(row.rider_id)?.name ?? null : null,
      riderPhone: row.rider_id ? riders.get(row.rider_id)?.phone ?? null : null,
      tripId: row.trip_id,
      tripTotal: row.trip_id ? tripTotals.get(row.trip_id) ?? null : null,
      tripLegs: row.trip_id ? legCounts.get(row.trip_id) ?? 1 : 1,
      refundStatus: row.refund_status,
      refundedAt: row.refunded_at,
    }));

    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load failed deliveries.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
