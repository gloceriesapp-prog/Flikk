'use client';

// Home starts with the store overview, followed by orders needing attention.

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import {
  fetchMyOrders,
  fetchMyProducts,
  fetchTodayStats,
  fetchMyPayouts,
  fetchMyReviews,
  type PartnerProduct,
} from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { DEMO_PRODUCTS } from '@/lib/demoProducts';
import { Card } from '@/components/ui/Card';
import { OverviewMetrics } from '@/components/home/OverviewMetrics';
import { RevenueCard } from '@/components/home/RevenueCard';
import { NewUpdatesCard } from '@/components/home/NewUpdatesCard';
import { RecentActivityCard } from '@/components/home/RecentActivityCard';
import { TopProductsCard } from '@/components/home/TopProductsCard';
import { Skeleton, useNow } from '@/components/home/parts';
import {
  outOfStockCount,
  todayStatsFrom,
  topProducts,
} from '@/components/home/dashboardData';

// Same cadence as the Orders page; useLiveData pauses it while the tab is hidden.
const POLL_MS = 12_000;
// Waiting times are shown in whole minutes, so a 15s tick is plenty.
const CLOCK_TICK_MS = 15_000;

export default function HomePage() {
  const now = useNow(CLOCK_TICK_MS);
  const [products, setProducts] = useState<PartnerProduct[]>([]);

  const { data: realOrders, isLoading, error: ordersError } = useLiveData(fetchMyOrders, POLL_MS);
  const { data: serverToday } = useLiveData(fetchTodayStats, POLL_MS);

  const { data: payouts } = useLiveData(fetchMyPayouts, 60_000);
  const { data: reviews } = useLiveData(fetchMyReviews, 60_000);

  // The catalogue changes rarely, so one fetch is enough; it only feeds the
  // out-of-stock warning.
  useEffect(() => {
    fetchMyProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  if (isLoading) return <HomeSkeleton />;

  // Demo values only when demo mode is on AND the store has no real orders;
  // never in a production build (see lib/demoMode.ts).
  const isDemo = DEMO_DATA_ENABLED && (realOrders?.length ?? 0) === 0;
  const orders = isDemo ? DEMO_ORDERS : (realOrders ?? []);
  const catalogue = isDemo && products.length === 0 ? DEMO_PRODUCTS : products;
  const today = isDemo ? todayStatsFrom(orders, now) : serverToday;

  return (
    <div className="flex flex-col gap-1.5 pb-3">
      {ordersError !== undefined && !isDemo && (
        <Card className="flex items-center gap-3 px-5 py-3.5 text-sm text-slate-600">
          <WifiOff size={17} className="shrink-0 text-amber-600" aria-hidden />
          Couldn&apos;t refresh orders. Retrying automatically.
        </Card>
      )}

      <OverviewMetrics orders={orders} products={catalogue} today={today} payouts={payouts} reviews={reviews} now={now} />

      <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueCard orders={orders} now={now} />
        </div>
        <NewUpdatesCard />
      </div>

      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        <RecentActivityCard orders={orders} now={now} />
        <TopProductsCard products={topProducts(orders, 7, now)} outOfStock={outOfStockCount(catalogue)} />
      </div>
    </div>
  );
}

// Mirrors the real layout so nothing jumps when data lands.
function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 pb-3" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
            <Skeleton className="h-11 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-3">
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
