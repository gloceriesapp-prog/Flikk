// Cash on delivery — the cash each rider collected at the door
// (rider_cash_collections, migration 108: one row per delivered COD order or
// trip, written by complete_verified_delivery) and whether it has been handed
// over yet. Service role, same as sibling routes; the admin session and
// allow-listed email are checked first.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/adminAccess';

export interface RiderCashBalance {
  riderId: string;
  riderName: string;
  riderPhone: string;
  outstandingAmount: number;
  outstandingCount: number;
  oldestCollectedAt: string | null;
  // The unsettled collections behind outstandingAmount — "Mark settled"
  // settles exactly these, never cash collected after the page loaded.
  outstandingIds: string[];
}

export interface CashCollection {
  id: string;
  riderId: string;
  riderName: string;
  // Order number of the order, or of the trip's first leg.
  orderLabel: string;
  isTrip: boolean;
  amount: number;
  collectedAt: string;
  settledAt: string | null;
  settlementRef: string | null;
}

export interface CashCollectionsResponse {
  riders: RiderCashBalance[];
  collections: CashCollection[];
}

const RECENT_LIMIT = 200;

interface CollectionRow {
  id: string;
  rider_id: string;
  order_id: string | null;
  trip_id: string | null;
  amount: number | string;
  collected_at: string;
  settled_at: string | null;
  settlement_ref: string | null;
}

export async function GET(request: Request) {
  const user = await requireAdminSession();
  if (!user || !isAllowedAdminEmail(user.email)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 });

  try {
    const view = new URL(request.url).searchParams.get('view');
    let query = supabaseAdmin
      .from('rider_cash_collections')
      .select('id, rider_id, order_id, trip_id, amount, collected_at, settled_at, settlement_ref');
    if (view === 'outstanding') query = query.is('settled_at', null);
    const [{ data: balances, error: balanceError }, { data, error }, { data: unsettled, error: unsettledError }] = await Promise.all([
      supabaseAdmin.rpc('rider_cash_outstanding'),
      query.order('collected_at', { ascending: false }).order('id', { ascending: false }).limit(RECENT_LIMIT),
      supabaseAdmin.from('rider_cash_collections').select('id, rider_id').is('settled_at', null),
    ]);
    if (balanceError) throw balanceError;
    if (error) throw error;
    if (unsettledError) throw unsettledError;
    const outstandingIds = new Map<string, string[]>();
    for (const row of (unsettled ?? []) as { id: string; rider_id: string }[]) {
      outstandingIds.set(row.rider_id, [...(outstandingIds.get(row.rider_id) ?? []), row.id]);
    }

    const outstanding = (balances ?? []) as { rider_id: string; outstanding_amount: number | string; outstanding_count: number | string; oldest_collected_at: string | null }[];
    const rows = (data ?? []) as CollectionRow[];

    const riderIds = [...new Set([...outstanding.map((b) => b.rider_id), ...rows.map((r) => r.rider_id)])];
    const orderIds = rows.map((r) => r.order_id).filter((id): id is string => !!id);
    const tripIds = rows.map((r) => r.trip_id).filter((id): id is string => !!id);
    const [riders, orders, legs] = await Promise.all([
      riderIds.length ? supabaseAdmin.from('riders').select('user_id, name, phone').in('user_id', riderIds) : { data: [], error: null },
      orderIds.length ? supabaseAdmin.from('orders').select('id, order_number').in('id', orderIds) : { data: [], error: null },
      tripIds.length ? supabaseAdmin.from('orders').select('trip_id, order_number').in('trip_id', tripIds).order('order_number') : { data: [], error: null },
    ]);
    for (const result of [riders, orders, legs]) if (result.error) throw result.error;

    const riderById = new Map(((riders.data ?? []) as { user_id: string; name: string | null; phone: string | null }[]).map((r) => [r.user_id, r]));
    const orderNumber = new Map(((orders.data ?? []) as { id: string; order_number: string | null }[]).map((o) => [o.id, o.order_number]));
    const tripNumber = new Map<string, string | null>();
    for (const leg of (legs.data ?? []) as { trip_id: string; order_number: string | null }[]) {
      if (!tripNumber.has(leg.trip_id)) tripNumber.set(leg.trip_id, leg.order_number);
    }

    const body: CashCollectionsResponse = {
      riders: outstanding.map((b) => ({
        riderId: b.rider_id,
        riderName: riderById.get(b.rider_id)?.name ?? 'Unknown rider',
        riderPhone: riderById.get(b.rider_id)?.phone ?? '—',
        outstandingAmount: Number(b.outstanding_amount),
        outstandingCount: Number(b.outstanding_count),
        oldestCollectedAt: b.oldest_collected_at,
        outstandingIds: outstandingIds.get(b.rider_id) ?? [],
      })),
      collections: rows.map((r) => ({
        id: r.id,
        riderId: r.rider_id,
        riderName: riderById.get(r.rider_id)?.name ?? 'Unknown rider',
        orderLabel: (r.trip_id ? tripNumber.get(r.trip_id) : orderNumber.get(r.order_id ?? '')) ?? '—',
        isTrip: !!r.trip_id,
        amount: Number(r.amount),
        collectedAt: r.collected_at,
        settledAt: r.settled_at,
        settlementRef: r.settlement_ref,
      })),
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'Could not load cash on delivery records.' }, { status: 500 });
  }
}
