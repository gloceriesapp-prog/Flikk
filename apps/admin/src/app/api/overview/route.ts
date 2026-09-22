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
//
// topStores: ranked by all-time order count (not revenue) — daily/total
// order counts come from one all-orders fetch, rating is stores.rating
// itself (real, recomputed on every review — backend/src/routes/
// reviews.ts). Top 5 only, per Top Performing Stores' own table redesign.

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

    const [todayOrdersRes, yesterdayOrdersRes, pendingRes, activeStoresRes, activeRidersRes, weekOrdersRes, allOrdersRes, storesRes] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('placed_at', todayStart),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('placed_at', yesterdayStart).lt('placed_at', todayStart),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('status', ['placed', 'packed']),
      supabaseAdmin.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('riders').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('orders').select('status, placed_at, delivered_at').gte('placed_at', weekStart),
      // Every order, all time, store_id + placed_at only — Top Performing
      // Stores' own "Total orders" (all-time) and "Daily order" (placed
      // today) columns both derive from this one fetch, no per-store RPC.
      supabaseAdmin.from('orders').select('store_id, placed_at'),
      supabaseAdmin.from('stores').select('id, name, district, rating'),
    ]);

    for (const res of [todayOrdersRes, yesterdayOrdersRes, pendingRes, activeStoresRes, activeRidersRes, weekOrdersRes, allOrdersRes, storesRes]) {
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
    const ordersByStore = new Map<string, { dailyOrders: number; totalOrders: number }>();
    for (const order of allOrdersRes.data ?? []) {
      const entry = ordersByStore.get(order.store_id) ?? { dailyOrders: 0, totalOrders: 0 };
      entry.totalOrders += 1;
      if (new Date(order.placed_at).getTime() >= new Date(todayStart).getTime()) entry.dailyOrders += 1;
      ordersByStore.set(order.store_id, entry);
    }
    // Ranked by all-time order volume — "performing" here means the store
    // that's actually moved the most orders, not a revenue figure the new
    // table no longer shows. Top 5 only, per an explicit ask.
    const topStores = [...ordersByStore.entries()]
      .map(([storeId, stats]) => ({
        storeId,
        name: storeById.get(storeId)?.name ?? 'Unknown store',
        district: storeById.get(storeId)?.district ?? '',
        rating: storeById.get(storeId)?.rating ?? null,
        ...stats,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 5);

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
