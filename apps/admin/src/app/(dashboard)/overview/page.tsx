'use client';

// Home / Daily snapshot — the reference's exact card grid: a wide chart
// card, a narrow column stacking a gauge over a fleet-equivalent card, and
// a tall tracking column, with a filtered activity table underneath.
//
// Real data now: app/api/overview (today's orders/pending/active stores/
// active riders/avg delivery time/completion rate/top stores) and
// app/api/balance (RazorpayX balance + payouts ledger) — both service-role
// Supabase reads, no dummy PLACEHOLDER_* left in this file. useAdminRealtime
// re-triggers both fetches whenever the customer, partner, or rider app
// writes to orders/stores/riders (app/api/realtime's SSE relay of a
// Supabase Realtime subscription), so this page stays live without a
// manual refresh — see specs/05-platform/realtime.md.
//
// "Riders online" from the original reference isn't real (no rider
// presence/heartbeat exists yet) — labelled "Active riders" here instead
// of a fabricated live count. App downloads stays PLACEHOLDER_APP_DOWNLOADS
// (App Store/Play Store Connect API, out of scope for this pass) and
// Needs Attention stays its own existing mock state — not touched here,
// not claimed as real. The old Live Delivery card (a mock rider map) was
// removed and replaced with LiveTrafficCard — real order-placement volume
// over the last hour, see that component's own note.

import { useCallback, useEffect, useState } from 'react';
import { Bike, Clock, PackageSearch, Store, Timer } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { BalanceSummaryCard, type BalanceSummary } from '@/components/dashboard/BalanceSummaryCard';
import { TopStoresCard, type TopStoreRow } from '@/components/dashboard/TopStoresCard';
import { CompletionGauge } from '@/components/dashboard/CompletionGauge';
import { AppDownloadsCard } from '@/components/dashboard/AppDownloadsCard';
import { LiveTrafficCard } from '@/components/dashboard/LiveTrafficCard';
import { NeedsAttentionWidget } from '@/components/dashboard/NeedsAttentionWidget';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { SystemStatusBadge } from '@/components/dashboard/SystemStatusBadge';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import { PLACEHOLDER_APP_DOWNLOADS } from '@/lib/mock-data';

interface OverviewStats {
  totalOrdersToday: number;
  ordersTodayChangePct?: number;
  pendingOrders: number;
  activeStores: number;
  activeRiders: number;
  avgDeliveryMinutes: number;
  completionRate: number;
  topStores: TopStoreRow[];
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/overview');
    if (res.ok) setStats(await res.json());
  }, []);

  const loadBalance = useCallback(async () => {
    const res = await fetch('/api/balance');
    if (res.ok) setBalance(await res.json());
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadStats);
    Promise.resolve().then(loadBalance);
  }, [loadStats, loadBalance]);

  // Balance depends on payouts, not orders/stores/riders directly, but a
  // new delivered order can change what's owed — refetching both on every
  // sync tick keeps them from ever quietly disagreeing.
  useAdminRealtime(() => {
    loadStats();
    loadBalance();
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-medium text-ink">Welcome back Founder...!</p>
          <h1 className="text-lg font-medium text-ink text-muted">
            {new Intl.DateTimeFormat('en-IN', { weekday: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date())}
          </h1>
        </div>
        <SystemStatusBadge />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={PackageSearch}
          value={String(stats?.totalOrdersToday ?? '—')}
          changePct={stats?.ordersTodayChangePct}
          label="Total orders today"
        />
        <StatCard icon={Clock} value={String(stats?.pendingOrders ?? '—')} label="Pending orders" />
        <StatCard icon={Store} value={String(stats?.activeStores ?? '—')} label="Active stores" />
        <StatCard icon={Bike} value={String(stats?.activeRiders ?? '—')} label="Active riders" />
        <StatCard icon={Timer} value={stats ? `${stats.avgDeliveryMinutes} min` : '—'} label="Avg. time to deliver" />
      </div>

      {/* Row 1 — Balance gets more room (it's the only one with real
          action content: the Withdraw button + payout-account row),
          Order completion / App downloads stay compact single-stat cards. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <BalanceSummaryCard balance={balance} />

        <Card title="Order completion" subtitle="Delivered vs. cancelled, this week" showMenu>
          <CompletionGauge completionRate={stats?.completionRate ?? 0} />
        </Card>

        <AppDownloadsCard stats={PLACEHOLDER_APP_DOWNLOADS} />
      </div>

      {/* Row 2 — two wide cards, side by side. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TopStoresCard topStores={stats?.topStores ?? []} />

        <LiveTrafficCard />
      </div>

      <NeedsAttentionWidget />

      <OrdersTable />
    </div>
  );
}
