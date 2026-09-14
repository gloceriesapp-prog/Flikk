// Revenue page's commission trend — real weekly totals from
// orders.commission_amount (delivered orders only), not payouts, since
// commission is earned the moment an order delivers, independent of when
// that store's payout cycle actually settles. Grouped by the Monday of
// each order's delivered_at week to match payouts' own week_start convention.

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
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('commission_amount, delivered_at')
      .eq('status', 'delivered')
      .not('delivered_at', 'is', null);
    if (error) throw error;

    const byWeek = new Map<string, number>();
    for (const row of data ?? []) {
      const week = mondayOf(new Date(row.delivered_at as string));
      byWeek.set(week, (byWeek.get(week) ?? 0) + Number(row.commission_amount));
    }

    const trend: RevenuePoint[] = [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, commission]) => ({
        label: `Wk ${new Date(week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        commission,
      }));

    return NextResponse.json(trend);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load revenue trend.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
