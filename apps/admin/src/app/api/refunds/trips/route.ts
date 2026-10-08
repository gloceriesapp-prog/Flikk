// Trip refunds — one row per trip_refunds job (the single combined refund
// for a multi-store trip's shared payment: queued by cancel_customer_trip /
// enqueue_trip_refund on cancellation, or approve_failed_trip_refund after a
// failed delivery). Ordered by what needs a human first. The backend worker
// is the only caller of the payment provider; a provider-rejected trip
// refund becomes 'manual_required', which "Mark refunded manually" closes
// through mark_order_refund_manual (POST /api/orders/[legId]/manual-refund
// with any leg, which completes the whole trip).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';

export interface TripRefundLeg {
  id: string;
  orderNumber: string;
  storeName: string;
  status: string;
  refundStatus: string;
  total: number;
}

export interface TripRefundRow {
  tripId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'manual_required';
  targetPaise: number;
  refundedPaise: number;
  attempts: number;
  lastError: string | null;
  providerRefundId: string | null;
  updatedAt: string;
  tripStatus: string;
  tripTotal: number;
  paymentProvider: string | null;
  paymentId: string;
  legs: TripRefundLeg[];
}

const RANK: Record<string, number> = { manual_required: 0, failed: 1, queued: 2, processing: 3, completed: 4 };

export async function GET() {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { data, error } = await supabaseAdmin
      .from('trip_refunds')
      .select('trip_id, status, target_paise, refunded_paise, attempts, last_error, provider_refund_id, payment_id, updated_at, trips(status, total, payment_provider)')
      .order('updated_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    type Row = { trip_id: string; status: TripRefundRow['status']; target_paise: number; refunded_paise: number; attempts: number; last_error: string | null; provider_refund_id: string | null; payment_id: string; updated_at: string; trips: { status: string; total: number; payment_provider: string | null } | null };
    const rows = (data ?? []) as unknown as Row[];
    const tripIds = rows.map((r) => r.trip_id);
    const { data: legs, error: legsError } = tripIds.length
      ? await supabaseAdmin.from('orders').select('id, trip_id, order_number, status, refund_status, total, placed_at, stores(name)').in('trip_id', tripIds).order('placed_at')
      : { data: [], error: null };
    if (legsError) throw legsError;
    const byTrip = new Map<string, TripRefundLeg[]>();
    for (const leg of (legs ?? []) as unknown as { id: string; trip_id: string; order_number: string | null; status: string; refund_status: string; total: number; stores: { name: string } | null }[]) {
      const list = byTrip.get(leg.trip_id) ?? [];
      list.push({ id: leg.id, orderNumber: leg.order_number ?? leg.id.slice(0, 8).toUpperCase(), storeName: leg.stores?.name ?? 'Unknown store', status: leg.status, refundStatus: leg.refund_status, total: Number(leg.total) });
      byTrip.set(leg.trip_id, list);
    }
    const result: TripRefundRow[] = rows
      .map((r) => ({
        tripId: r.trip_id,
        status: r.status,
        targetPaise: Number(r.target_paise),
        refundedPaise: Number(r.refunded_paise),
        attempts: r.attempts,
        lastError: r.last_error,
        providerRefundId: r.provider_refund_id,
        updatedAt: r.updated_at,
        tripStatus: r.trips?.status ?? 'unknown',
        tripTotal: Number(r.trips?.total ?? 0),
        paymentProvider: r.trips?.payment_provider ?? null,
        paymentId: r.payment_id,
        legs: byTrip.get(r.trip_id) ?? [],
      }))
      .sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9));
    return NextResponse.json(result);
  } catch (err) {
    console.error('Trip refunds failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load trip refunds.' }, { status: 500 });
  }
}
