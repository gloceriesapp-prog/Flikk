// Rider payouts — real data (public.rider_earnings, migrations/001_init.sql),
// previously with zero admin visibility at all: earnings accumulated in
// the DB (written on every delivered order, backend/src/routes/orders.ts)
// but paid_at was never set anywhere, and no admin screen ever read the
// table. Riders don't have a verified payout destination yet (no
// riders.payout_method/razorpay_fund_account_id column exists, unlike
// stores) — real RazorpayX rider payout automation is a bigger, separate
// feature; this is the same honest "founder marks it settled" mechanism
// stores themselves used before that automation existed for them
// (app/api/payouts' own PATCH note).
//
// Commission (platform revenue, app/api/revenue-trend) and rider earnings
// (this table) are two genuinely separate pools — a rider's amount is
// always that order's own delivery_fee, never a cut of commission_amount
// (backend/src/routes/orders.ts's own note on rider_earnings writes). This
// route reports the rider side of that split; it never touches commission.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface EarningRow {
  rider_id: string;
  amount: number;
  paid_at: string | null;
  users: { name: string | null; phone: string } | null;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('rider_earnings')
      .select('rider_id, amount, paid_at, users!rider_id(name, phone)');
    if (error) throw error;

    const byRider = new Map<
      string,
      { riderId: string; name: string; phone: string; pending: number; paid: number; orderCount: number }
    >();
    for (const row of (data ?? []) as unknown as EarningRow[]) {
      const entry = byRider.get(row.rider_id) ?? {
        riderId: row.rider_id,
        name: row.users?.name ?? 'Unnamed rider',
        phone: row.users?.phone ?? '',
        pending: 0,
        paid: 0,
        orderCount: 0,
      };
      entry.orderCount += 1;
      if (row.paid_at) entry.paid += Number(row.amount);
      else entry.pending += Number(row.amount);
      byRider.set(row.rider_id, entry);
    }

    const riders = [...byRider.values()].sort((a, b) => b.pending - a.pending);
    return NextResponse.json(riders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rider payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Marks every currently-unpaid rider_earnings row as paid — the real
// weekly settlement mechanism until riders have a verified payout
// destination and RazorpayX automation like stores do. Global release,
// same shape as app/api/payouts' own PATCH (all pending stores at once,
// not one at a time).
export async function PATCH() {
  try {
    const { error } = await supabaseAdmin
      .from('rider_earnings')
      .update({ paid_at: new Date().toISOString() })
      .is('paid_at', null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not release rider payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
