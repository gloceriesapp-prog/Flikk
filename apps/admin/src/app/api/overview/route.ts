// Overview page's stat row + completion gauge + top stores — one SQL
// aggregate (admin_overview_stats, migration 118), service role. It used to
// fetch order rows and reduce them here, which silently stopped counting at
// PostgREST's 1,000-row page (all-time top-store totals and the week's
// completion/average once volume grew); counting in Postgres has no cap.
//
// "Riders online" from the reference design doesn't exist as real data —
// no rider app heartbeat/presence column exists yet (riders.is_active is
// "approved and enabled", not "has the app open right now"). Reported
// here as activeRiders and labelled honestly on the client.
//
// Days are IST calendar days. completionRate is delivered / (delivered +
// cancelled) over the last 7 IST days plus today; avgDeliveryMinutes is the
// mean placed->delivered time over the same window. topStores: top 5 by
// all-time order count, with today's count and stores.rating.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface OverviewAggregate {
  totalOrdersToday: number;
  ordersYesterday: number;
  pendingOrders: number;
  activeStores: number;
  activeRiders: number;
  weekDelivered: number;
  weekCancelled: number;
  avgDeliveryMinutes: number;
  topStores: { storeId: string; name: string; district: string; rating: number | null; dailyOrders: number; totalOrders: number }[];
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.rpc('admin_overview_stats', {});
    if (error) throw error;
    const stats = data as OverviewAggregate;
    const today = Number(stats.totalOrdersToday ?? 0);
    const yesterday = Number(stats.ordersYesterday ?? 0);
    const delivered = Number(stats.weekDelivered ?? 0);
    const cancelled = Number(stats.weekCancelled ?? 0);
    return NextResponse.json({
      totalOrdersToday: today,
      ordersTodayChangePct: yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : undefined,
      pendingOrders: Number(stats.pendingOrders ?? 0),
      activeStores: Number(stats.activeStores ?? 0),
      activeRiders: Number(stats.activeRiders ?? 0),
      avgDeliveryMinutes: Number(stats.avgDeliveryMinutes ?? 0),
      completionRate: delivered + cancelled > 0 ? (delivered / (delivered + cancelled)) * 100 : 100,
      topStores: (stats.topStores ?? []).map((s) => ({
        storeId: s.storeId,
        name: s.name,
        district: s.district,
        rating: s.rating == null ? null : Number(s.rating),
        dailyOrders: Number(s.dailyOrders),
        totalOrders: Number(s.totalOrders),
      })),
    });
  } catch (err) {
    console.error('Overview stats failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load overview stats.' }, { status: 500 });
  }
}
