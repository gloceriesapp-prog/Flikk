// Overview page's stat row + completion gauge + top stores — one SQL
// aggregate (admin_overview_stats, migration 118), service role. It used to
// fetch order rows and reduce them here, which silently stopped counting at
// PostgREST's 1,000-row page (all-time top-store totals and the week's
// completion/average once volume grew); counting in Postgres has no cap.
//
// "Riders online" is now REAL presence, not the approved-rider count the
// admin_overview_stats RPC still returns as activeRiders. We count riders
// whose status is 'online' with a position ping inside the dispatch freshness
// window (lib/riderPresence) — the same "live now" rule the riders page and
// the dispatch map use — so a killed app drops off instead of counting
// forever. activeRiders from the RPC is ignored here.
//
// Days are IST calendar days. completionRate is delivered / (delivered +
// cancelled) over the last 7 IST days plus today; avgDeliveryMinutes is the
// mean placed->delivered time over the same window. topStores: top 5 by
// all-time order count, with today's count and stores.rating.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isFreshPing } from '@/lib/riderPresence';

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
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const now = Date.now();
    const [statsRes, onlineRes] = await Promise.all([
      supabaseAdmin.rpc('admin_overview_stats', {}),
      supabaseAdmin
        .from('riders')
        .select('last_location_update')
        .eq('status', 'online')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null),
    ]);
    if (statsRes.error) throw statsRes.error;
    if (onlineRes.error) throw onlineRes.error;
    const stats = statsRes.data as OverviewAggregate;
    const ridersOnline = (onlineRes.data ?? []).filter((r) => isFreshPing(r.last_location_update as string | null, now)).length;
    const today = Number(stats.totalOrdersToday ?? 0);
    const yesterday = Number(stats.ordersYesterday ?? 0);
    const delivered = Number(stats.weekDelivered ?? 0);
    const cancelled = Number(stats.weekCancelled ?? 0);
    return NextResponse.json({
      totalOrdersToday: today,
      ordersTodayChangePct: yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : undefined,
      pendingOrders: Number(stats.pendingOrders ?? 0),
      activeStores: Number(stats.activeStores ?? 0),
      activeRiders: ridersOnline,
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
