// Home / Daily snapshot — the reference's exact card grid: a wide chart
// card, a narrow column stacking a gauge over a fleet-equivalent card, and
// a tall tracking column, with a filtered activity table underneath. Not
// in the original A1-A4 spec, but the one glance-and-go screen a founder
// actually opens first — redirected here from /.

import { Bike, Clock, PackageSearch, Store, Timer } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { BalanceSummaryCard } from '@/components/dashboard/BalanceSummaryCard';
import { TopStoresCard } from '@/components/dashboard/TopStoresCard';
import { CompletionGauge } from '@/components/dashboard/CompletionGauge';
import { AppDownloadsCard } from '@/components/dashboard/AppDownloadsCard';
import { DeliveryTrackingCard } from '@/components/dashboard/DeliveryTrackingCard';
import { NeedsAttentionWidget } from '@/components/dashboard/NeedsAttentionWidget';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { SystemStatusBadge } from '@/components/dashboard/SystemStatusBadge';
import {
  PLACEHOLDER_ACTIVE_RIDERS,
  PLACEHOLDER_APP_DOWNLOADS,
  PLACEHOLDER_ORDERS,
  PLACEHOLDER_PRODUCT_PERFORMANCE,
  PLACEHOLDER_STORES,
} from '@/lib/mock-data';

export default function OverviewPage() {
  const totalOrders = PLACEHOLDER_ORDERS.length;
  const pending = PLACEHOLDER_ORDERS.filter((o) => o.status === 'placed' || o.status === 'packed').length;
  const activeStores = PLACEHOLDER_STORES.filter((s) => s.isActive).length;
  const activeRiders = PLACEHOLDER_ACTIVE_RIDERS.filter((r) => r.isOnline).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-medium text-ink">Welcome back Founder...!</p>
          <h1 className="text-lg font-medium text-ink text-muted">Tuesday, 6:40 PM</h1>
        </div>
        <SystemStatusBadge />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={PackageSearch} value={String(totalOrders)} changePct={11.2} label="Total orders today" />
        <StatCard icon={Clock} value={String(pending)} changePct={4.8} label="Pending orders" />
        <StatCard icon={Store} value={String(activeStores)} changePct={2.1} label="Active stores" />
        <StatCard icon={Bike} value={String(activeRiders)} changePct={0} label="Riders online" />
        <StatCard
          icon={Timer}
          value={`${PLACEHOLDER_PRODUCT_PERFORMANCE.avgDeliveryMinutes} min`}
          changePct={-3.4}
          label="Avg. time to deliver"
        />
      </div>

      {/* Left column: Balance (revenue hero + quick stats) stacked over Top
          Performing Stores — both real "know everything at a glance"
          content, not a decorative chart. Middle column keeps Order
          completion/App downloads stacked. Right column (Live Delivery)
          spans the full row height. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <BalanceSummaryCard />

        <Card title="Order completion" subtitle="Delivered vs. cancelled, this week" showMenu>
          <CompletionGauge completionRate={PLACEHOLDER_PRODUCT_PERFORMANCE.completionRate} />
        </Card>

        <div className="min-w-0 lg:row-span-2">
          <DeliveryTrackingCard />
        </div>

        <TopStoresCard />

        <AppDownloadsCard stats={PLACEHOLDER_APP_DOWNLOADS} />
      </div>

      <NeedsAttentionWidget />

      <OrdersTable />
    </div>
  );
}
