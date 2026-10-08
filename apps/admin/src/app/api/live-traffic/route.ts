// Live traffic — real activity across the three apps that actually exist
// in this product (there is no separate customer website — CLAUDE.md's own
// app-surface table has customer/partner/rider as native apps only), so
// "traffic" here is scoped to what's genuinely real: how often each app is
// doing the one thing that moves an order forward.
//
// One order's lifecycle already carries a real per-app timestamp for each
// stage: placed_at is set the moment the customer app places an order,
// packed_at the moment the partner app marks it packed, picked_up_at the
// moment the rider app accepts/picks it up. Bucketing each of those three
// columns by calendar day gives a real, honest "customer / partner / rider
// app activity" trend with zero new tracking infrastructure — no fabricated
// "website visitors" or "Android/iOS sessions" number exists anywhere in
// this schema, so this reports the real equivalent instead of inventing one.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

function istMidnightUtcIso(daysAgo: number): string {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCDate(ist.getUTCDate() - daysAgo);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS).toISOString();
}

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range') ?? '7d';
    const days = RANGE_DAYS[rangeParam] ?? RANGE_DAYS['7d'];

    const rangeStart = istMidnightUtcIso(days - 1);
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('placed_at, packed_at, picked_up_at')
      .gte('placed_at', rangeStart);
    if (error) throw error;

    const dayBuckets = Array.from({ length: days }, (_, i) => ({
      date: istMidnightUtcIso(days - 1 - i),
      customerApp: 0,
      partnerApp: 0,
      riderApp: 0,
    }));

    // Finds the last bucket boundary a timestamp falls on/after — same
    // "which IST calendar day did this land on" logic app/api/overview's
    // own weeklyOrderTrend uses.
    function bucketFor(iso: string | null) {
      if (!iso) return null;
      const ms = new Date(iso).getTime();
      for (let i = dayBuckets.length - 1; i >= 0; i -= 1) {
        if (ms >= new Date(dayBuckets[i].date).getTime()) return dayBuckets[i];
      }
      return null;
    }

    // One pass per column so each timestamp is independently bucketed —
    // combining them in one pass above would silently skip an order whose
    // packed_at bucket differs from its placed_at bucket (e.g. placed late
    // one night, packed the next morning).
    for (const order of data ?? []) {
      const b = bucketFor(order.placed_at);
      if (b) b.customerApp += 1;
    }
    for (const order of data ?? []) {
      const b = bucketFor(order.packed_at);
      if (b) b.partnerApp += 1;
    }
    for (const order of data ?? []) {
      const b = bucketFor(order.picked_up_at);
      if (b) b.riderApp += 1;
    }

    const totals = dayBuckets.reduce(
      (acc, b) => ({
        customerApp: acc.customerApp + b.customerApp,
        partnerApp: acc.partnerApp + b.partnerApp,
        riderApp: acc.riderApp + b.riderApp,
      }),
      { customerApp: 0, partnerApp: 0, riderApp: 0 },
    );

    return NextResponse.json({ points: dayBuckets, totals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load live traffic.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
