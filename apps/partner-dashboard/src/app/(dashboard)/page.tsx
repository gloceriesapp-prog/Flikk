'use client';

// Home: order-first. The shell above already shows the page title and the
// online switch, so this starts straight with the order pipeline, then the
// queue of new orders to accept, then money and what's selling.

import { useEffect, useState } from 'react';
import { Bike, PackageCheck, ShoppingBasket, WifiOff } from 'lucide-react';
import {
  fetchMyOrders,
  fetchMyProducts,
  fetchTodayStats,
  updateOrderStatus,
  type PartnerOrder,
  type PartnerProduct,
} from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { useStoreContext } from '@/lib/storeContext';
import { formatInr } from '@/lib/format';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { DEMO_PRODUCTS } from '@/lib/demoProducts';
import { toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/home/KpiCard';
import { NeedsAttentionCard } from '@/components/home/NeedsAttentionCard';
import { RevenueCard } from '@/components/home/RevenueCard';
import { TodayCard } from '@/components/home/TodayCard';
import { RecentActivityCard } from '@/components/home/RecentActivityCard';
import { TopProductsCard } from '@/components/home/TopProductsCard';
import { Skeleton, useNow } from '@/components/home/parts';
import {
  averageOrderValueToday,
  isStoreToday,
  minutesSince,
  outOfStockCount,
  sumTotals,
  todayStatsFrom,
  topProducts,
} from '@/components/home/dashboardData';

// Same cadence as the Orders page; useLiveData pauses it while the tab is hidden.
const POLL_MS = 12_000;
// Waiting times are shown in whole minutes, so a 15s tick is plenty.
const CLOCK_TICK_MS = 15_000;

export default function HomePage() {
  const { store } = useStoreContext();
  const now = useNow(CLOCK_TICK_MS);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const { data: realOrders, isLoading, error: ordersError, refetch } = useLiveData(fetchMyOrders, POLL_MS);
  const { data: serverToday, refetch: refetchToday } = useLiveData(fetchTodayStats, POLL_MS);

  // The catalogue changes rarely, so one fetch is enough; it only feeds the
  // out-of-stock warning.
  useEffect(() => {
    fetchMyProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  async function handleAccept(order: PartnerOrder) {
    if (acceptingId) return;
    setAcceptingId(order.id);
    try {
      await updateOrderStatus(order.id, 'packed');
      await Promise.all([refetch(), refetchToday()]);
      toast.success(`Order #${order.order_number} accepted. Start packing.`);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : `Couldn't accept #${order.order_number}. Try again.`);
    } finally {
      setAcceptingId(null);
    }
  }

  if (isLoading) return <HomeSkeleton />;

  // Demo values only when demo mode is on AND the store has no real orders;
  // never in a production build (see lib/demoMode.ts).
  const isDemo = DEMO_DATA_ENABLED && (realOrders?.length ?? 0) === 0;
  const orders = isDemo ? DEMO_ORDERS : (realOrders ?? []);
  const catalogue = isDemo && products.length === 0 ? DEMO_PRODUCTS : products;
  const today = isDemo ? todayStatsFrom(orders, now) : serverToday;

  const placed = orders.filter((o) => o.status === 'placed');
  const packed = orders.filter((o) => o.status === 'packed');
  const onTheWay = orders.filter((o) => o.status === 'out_for_delivery');
  const deliveredToday = orders.filter((o) => o.status === 'delivered' && isStoreToday(o.delivered_at, now)).length;
  const oldestWait = placed.reduce((max, o) => Math.max(max, minutesSince(o.placed_at, now)), 0);

  const storeState = !store
    ? 'unknown'
    : store.admin_suspended
      ? 'suspended'
      : store.is_active
        ? 'online'
        : 'offline';

  return (
    <div className="flex flex-col gap-4 pb-4">
      {ordersError !== undefined && !isDemo && (
        <Card className="flex items-center gap-3 px-5 py-3.5 text-sm text-slate-600">
          <WifiOff size={17} className="shrink-0 text-amber-600" aria-hidden />
          Couldn&apos;t refresh orders. Retrying automatically.
        </Card>
      )}

      <section aria-label="Order pipeline" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={ShoppingBasket}
          label="New orders"
          value={placed.length}
          highlight={placed.length > 0}
          sub={placed.length > 0 ? `Oldest ${oldestWait} min` : 'All caught up'}
          action={placed.length > 0 ? { href: '/orders', label: 'Review' } : undefined}
        />
        <KpiCard
          icon={PackageCheck}
          label="Being packed"
          value={packed.length}
          sub={packed.length > 0 ? `${formatInr(sumTotals(packed))} to hand over` : 'Nothing to pack'}
        />
        <KpiCard
          icon={Bike}
          label="Out for delivery"
          value={onTheWay.length}
          sub={`${deliveredToday} delivered today`}
        />
      </section>

      <NeedsAttentionCard
        orders={placed}
        now={now}
        storeState={storeState}
        onAccept={isDemo ? undefined : handleAccept}
        acceptingId={acceptingId}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueCard orders={orders} now={now} />
        </div>
        <TodayCard stats={today} averageOrderValue={averageOrderValueToday(orders, now)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecentActivityCard orders={orders} now={now} />
        <TopProductsCard products={topProducts(orders, 7, now)} outOfStock={outOfStockCount(catalogue)} />
      </div>
    </div>
  );
}

// Mirrors the real layout so nothing jumps when data lands.
function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
            <Skeleton className="h-11 w-20" />
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3 p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[72px] w-full rounded-2xl" />
        <Skeleton className="h-[72px] w-full rounded-2xl" />
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="flex flex-col gap-4 p-6 xl:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[220px] w-full rounded-2xl" />
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </Card>
      </div>
    </div>
  );
}
