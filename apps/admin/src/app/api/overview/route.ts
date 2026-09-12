// Overview page's stat row + completion gauge + top stores — real Supabase
// reads (service role, same rationale as every other route here: orders/
// payouts have no public RLS read policy, and this dashboard has no admin
// login session to satisfy one). Aggregated in JS rather than a Postgres
// RPC — MVP order volume (CLAUDE.md) is small enough that fetching one
// window of rows and reducing them here is simpler than maintaining SQL
// functions for four different numbers.
//
// "Riders online" from the reference design doesn't exist as real data —
// no rider app heartbeat/presence column exists yet (riders.is_active is
// "approved and enabled", not "has the app open right now"). Reported
// here as activeRiders and labelled honestly on the client rather than
// faked as a live presence count.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istMidnightUtcIso(daysAgo: number): string {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCDate(ist.getUTCDate() - daysAgo);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS).toISOString();
}

export async function GET() {
  try {
    const todayStart = istMidnightUtcIso(0);
    const yesterdayStart = istMidnightUtcIso(1);
    const weekStart = istMidnightUtcIso(7);
    const monthStart = istMidnightUtcIso(30);

    const [todayOrdersRes, yesterdayOrdersRes, pendingRes, activeStoresRes, activeRidersRes, weekOrdersRes, monthOrdersRes, storesRes] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('placed_at', todayStart),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('placed_at', yesterdayStart).lt('placed_at', todayStart),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('status', ['placed', 'packed']),
      supabaseAdmin.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('riders').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('orders').select('status, placed_at, delivered_at').gte('placed_at', weekStart),
      supabaseAdmin.from('orders').select('store_id, total, status').gte('placed_at', monthStart).eq('status', 'delivered'),
      supabaseAdmin.from('stores').select('id, name, district'),
    ]);

    for (const res of [todayOrdersRes, yesterdayOrdersRes, pendingRes, activeStoresRes, activeRidersRes, weekOrdersRes, monthOrdersRes, storesRes]) {
      if (res.error) throw res.error;
    }

    const todayCount = todayOrdersRes.count ?? 0;
    const yesterdayCount = yesterdayOrdersRes.count ?? 0;
    const ordersTodayChangePct = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 1000) / 10 : undefined;

    const weekOrders = weekOrdersRes.data ?? [];
    const delivered = weekOrders.filter((o) => o.status === 'delivered');
    const cancelled = weekOrders.filter((o) => o.status === 'cancelled');
    const completionRate = delivered.length + cancelled.length > 0 ? (delivered.length / (delivered.length + cancelled.length)) * 100 : 100;

    const deliveryDurations = delivered
      .filter((o) => o.delivered_at)
      .map((o) => (new Date(o.delivered_at!).getTime() - new Date(o.placed_at).getTime()) / 60000);
    const avgDeliveryMinutes = deliveryDurations.length > 0 ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length) : 0;

    const storeById = new Map((storesRes.data ?? []).map((s) => [s.id, s]));
    const revenueByStore = new Map<string, { orders: number; revenue: number }>();
    for (const order of monthOrdersRes.data ?? []) {
      const entry = revenueByStore.get(order.store_id) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += Number(order.total);
      revenueByStore.set(order.store_id, entry);
    }
    const topStores = [...revenueByStore.entries()]
      .map(([storeId, stats]) => ({ storeId, name: storeById.get(storeId)?.name ?? 'Unknown store', district: storeById.get(storeId)?.district ?? '', ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);

    return NextResponse.json({
      totalOrdersToday: todayCount,
      ordersTodayChangePct,
      pendingOrders: pendingRes.count ?? 0,
      activeStores: activeStoresRes.count ?? 0,
      activeRiders: activeRidersRes.count ?? 0,
      avgDeliveryMinutes,
      completionRate,
      topStores,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load overview stats.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
