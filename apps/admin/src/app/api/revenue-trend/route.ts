// Revenue page's earnings trend — real weekly totals of everything Gloceries
// actually keeps: commission (from stores, orders.commission_amount) AND
// the handling/platform fee (from customers, orders.handling_fee /
// trips.handling_fee — migrations/041_order_handling_fee.sql). Both are
// real money that's never paid out to a store or a rider (a store's own
// payout is gross item_total minus commission only; a rider's own payout
// is the delivery_fee only — neither pool ever includes the handling fee),
// so both belong in "how much Gloceries earned," not just commission alone.
//
// Summed in Postgres (admin_revenue_trend, migration 118) — fetching the
// delivered orders here stopped at PostgREST's 1,000-row page, so the
// all-time total quietly stopped growing. Weeks start Monday (IST),
// matching payouts' week_start. A single-store order counts in the week it
// was delivered; a multi-store trip counts once, only when every leg is
// delivered, in its last leg's week, with the trip-level handling fee.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { RevenuePoint } from '@/lib/types';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { data, error } = await supabaseAdmin.rpc('admin_revenue_trend');
    if (error) throw error;
    const rows = (data ?? []) as { week_start: string; commission: number | string; platform_fee: number | string }[];
    const trend: RevenuePoint[] = rows.map((row) => ({
      label: `Wk ${new Date(`${row.week_start}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`,
      commission: Number(row.commission),
      platformFee: Number(row.platform_fee),
    }));
    return NextResponse.json(trend);
  } catch (err) {
    console.error('Revenue trend failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load revenue trend.' }, { status: 500 });
  }
}
