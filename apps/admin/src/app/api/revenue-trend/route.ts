// Revenue page's earnings trend — real weekly totals of everything Gloceries
// actually keeps: commission (from stores, orders.commission_amount) AND
// the handling/platform fee (from customers, orders.handling_fee /
// trips.handling_fee — migrations/041_order_handling_fee.sql). Both are
// real money that's never paid out to a store or a rider (a store's own
// payout is gross item_total minus commission only; a rider's own payout
// is the delivery_fee only — neither pool ever includes the handling fee),
// so both belong in "how much Gloceries earned," not just commission alone.
// Grouped by the Monday of each order's delivered_at week to match
// payouts' own week_start convention.
//
// Single-store orders (trip_id null) charge their own handling_fee
// directly. A multi-store trip charges it once at the trip level
// (trip.handling_fee, real per orders.ts's own note on why: one combined
// checkout, one fee) — counted here only once the trip is FULLY delivered
// (every leg independently delivered), not per-leg, so a 3-store trip
// doesn't triple-count one checkout's fee.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { RevenuePoint } from '@/lib/types';

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const [singleStoreRes, tripsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('commission_amount, handling_fee, delivered_at')
        .eq('status', 'delivered')
        .is('trip_id', null)
        .not('delivered_at', 'is', null),
      supabaseAdmin.from('trips').select('id, handling_fee, orders(status, commission_amount, delivered_at)'),
    ]);
    if (singleStoreRes.error) throw singleStoreRes.error;
    if (tripsRes.error) throw tripsRes.error;

    const byWeek = new Map<string, { commission: number; platformFee: number }>();

    function add(week: string, commission: number, platformFee: number) {
      const entry = byWeek.get(week) ?? { commission: 0, platformFee: 0 };
      entry.commission += commission;
      entry.platformFee += platformFee;
      byWeek.set(week, entry);
    }

    for (const row of singleStoreRes.data ?? []) {
      const week = mondayOf(new Date(row.delivered_at as string));
      add(week, Number(row.commission_amount), Number(row.handling_fee));
    }

    for (const trip of tripsRes.data ?? []) {
      const legs = (trip.orders ?? []) as { status: string; commission_amount: number; delivered_at: string | null }[];
      if (legs.length === 0 || !legs.every((leg) => leg.status === 'delivered')) continue;

      // Every leg's own commission was already earned independently — the
      // trip's handling_fee is the one thing that only exists at the trip
      // level, attributed to whichever leg happened to deliver last (same
      // "last leg to finish" convention orders.ts's own rider_earnings
      // trip-payout logic already uses).
      const lastDeliveredAt = legs.reduce((latest, leg) => (leg.delivered_at! > latest ? leg.delivered_at! : latest), legs[0].delivered_at!);
      const week = mondayOf(new Date(lastDeliveredAt));
      const commissionSum = legs.reduce((sum, leg) => sum + Number(leg.commission_amount), 0);
      add(week, commissionSum, Number(trip.handling_fee));
    }

    const trend: RevenuePoint[] = [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, { commission, platformFee }]) => ({
        label: `Wk ${new Date(week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        commission,
        platformFee,
      }));

    return NextResponse.json(trend);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load revenue trend.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
