'use client';

// No backend aggregation endpoint exists for partner analytics yet — this
// computes everything client-side from the same real /partner/orders and
// /partner/products data the Orders/Inventory pages already use. Fine at
// current single-store order volume; move to a real backend rollup if a
// store's order count grows large enough for this to matter.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, ListOrdered, Receipt, ShoppingBasket, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { fetchMyOrders } from '@/lib/partnerApi';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { orderNetRevenue, lineNetRevenue } from '@/lib/orderRevenue';
import { useLiveData } from '@/lib/useLiveData';
import { Card } from '@/components/ui/Card';
import { formatInr } from '@/lib/format';
import { MetricCard, MetricGrid } from '@/components/inventory/MetricCard';
import { BUTTON, EmptyState, ErrorState, MetricGridSkeleton, Skeleton, chipClass } from '@/components/inventory/DataStates';

// Trend window — a pill range selector picks one; 14 days is the default
// (what this page always showed).
const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];
const DEFAULT_RANGE: Range = 14;
// Historical rollups move slowly — poll lightly, and the hook pauses it while
// the tab is hidden.
const ANALYTICS_POLL_MS = 60_000;

const ACCENT = '#155dfc';
const ACCENT_MUTED = '#c7d7fe';
const GRID = '#eef0f3';
const AXIS = '#94a3b8';

// ₹1.2k / ₹12k / ₹1.5L — short enough for a 48px axis.
function compactInr(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(value >= 1_000_000 ? 0 : 1).replace(/\.0$/, '')}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(value)}`;
}

interface Day {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

function ChartTooltip({ active, payload, kind }: { active?: boolean; payload?: { payload: Day }[]; kind: 'revenue' | 'orders' }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
      <p className="text-slate-300">{d.label}</p>
      <p className="tnum mt-0.5 text-sm font-semibold">
        {kind === 'revenue' ? formatInr(d.revenue) : `${d.orders} ${d.orders === 1 ? 'order' : 'orders'}`}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useLiveData(fetchMyOrders, ANALYTICS_POLL_MS);
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const loadError = !!error && data === undefined;
  // DEMO DATA — same isDemo convention as Overview/Orders: only while the
  // store has no real orders, and never in a production build.
  const isDemo = DEMO_DATA_ENABLED && !isLoading && (data?.length ?? 0) === 0;
  const orders = useMemo(() => (isDemo ? DEMO_ORDERS : (data ?? [])), [data, isDemo]);

  const delivered = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);

  const dailySeries = useMemo(() => {
    const days: Day[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      days.push({ date: key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0, orders: 0 });
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const order of delivered) {
      const key = new Date(order.placed_at).toDateString();
      const bucket = byDate.get(key);
      if (bucket) {
        // NET store revenue (item_total − commission_amount), not the gross
        // customer-paid total — see orderRevenue.ts.
        bucket.revenue += orderNetRevenue(order);
        bucket.orders += 1;
      }
    }
    return days;
  }, [delivered, range]);

  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; revenue: number; units: number }>();
    for (const order of delivered) {
      for (const item of order.order_items) {
        const name = item.products?.name ?? 'Item';
        const existing = totals.get(name) ?? { name, revenue: 0, units: 0 };
        // NET revenue for this line: gross line value with the order's
        // commission apportioned out, so top-product revenue is store income
        // on the same basis as the totals above (orderRevenue.ts).
        existing.revenue += lineNetRevenue(order, item.unit_price_at_order * item.quantity);
        existing.units += item.quantity;
        totals.set(name, existing);
      }
    }
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [delivered]);

  // All-time store NET revenue (what the store keeps), and AOV on that same net
  // basis so the two figures agree.
  const totalRevenue = delivered.reduce((sum, o) => sum + orderNetRevenue(o), 0);
  const avgOrderValue = delivered.length ? totalRevenue / delivered.length : 0;
  const cancelledCount = orders.length - delivered.length;
  const rangeRevenue = dailySeries.reduce((sum, d) => sum + d.revenue, 0);
  const rangeOrders = dailySeries.reduce((sum, d) => sum + d.orders, 0);
  const topRevenue = topProducts[0]?.revenue ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <MetricGridSkeleton />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-[260px] w-full rounded-2xl" />
          </Card>
          <Card className="flex flex-col gap-4 p-5">
            <Skeleton className="h-5 w-32" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </Card>
        </div>
      </div>
    );
  }

  if (loadError && !isDemo) {
    return (
      <Card>
        <ErrorState title="Couldn’t load your sales data" onRetry={() => void refetch()} />
      </Card>
    );
  }

  const xInterval = range === 30 ? 4 : range === 14 ? 1 : 0;

  return (
    <div className="flex flex-col gap-4">
      <MetricGrid>
        <MetricCard label="Net revenue" value={formatInr(totalRevenue)} sublabel="All-time, net of commission" icon={Wallet} tone="green" />
        <MetricCard label="Orders" value={delivered.length} sublabel="All-time, excl. cancelled" icon={ListOrdered} tone="blue" />
        <MetricCard label="Avg. order value" value={formatInr(avgOrderValue)} sublabel="Net per order" icon={Receipt} tone="amber" />
        <MetricCard label="Cancelled" value={cancelledCount} sublabel="All-time" icon={Ban} tone={cancelledCount > 0 ? 'red' : 'slate'} />
      </MetricGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {/* Revenue trend */}
          <Card className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Net revenue</h2>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="tnum text-2xl font-semibold tracking-tight text-ink">{formatInr(rangeRevenue)}</span>
                  <span className="text-sm text-slate-500">last {range} days</span>
                </p>
              </div>
              <div className="flex gap-1.5" role="tablist" aria-label="Date range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-selected={range === r}
                    onClick={() => setRange(r)}
                    className={clsx(chipClass(range === r), 'px-3 py-1 text-[13px]')}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  interval={xInterval}
                  tickMargin={10}
                  minTickGap={8}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => compactInr(v)}
                />
                <Tooltip content={<ChartTooltip kind="revenue" />} cursor={{ stroke: ACCENT, strokeOpacity: 0.25, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  dot={false}
                  activeDot={{ r: 5, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Order volume */}
          <Card className="min-w-0 p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-ink">Order volume</h2>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="tnum text-2xl font-semibold tracking-tight text-ink">{rangeOrders}</span>
                <span className="text-sm text-slate-500">orders, last {range} days</span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  interval={xInterval}
                  tickMargin={10}
                  minTickGap={8}
                />
                <YAxis tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={false} width={52} allowDecimals={false} />
                <Tooltip content={<ChartTooltip kind="orders" />} cursor={{ fill: '#f1f5f9', radius: 8 }} />
                <Bar dataKey="orders" radius={[6, 6, 6, 6]} maxBarSize={range === 30 ? 14 : 28}>
                  {/* Today in brand blue, earlier days muted — the reference's
                      "one highlighted bar" read. */}
                  {dailySeries.map((d, i) => (
                    <Cell key={d.date} fill={i === dailySeries.length - 1 ? ACCENT : ACCENT_MUTED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top products */}
        <Card className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-ink">Top products</h2>
            <p className="text-sm text-slate-500">By net revenue, all-time</p>
          </div>
          {topProducts.length === 0 ? (
            <EmptyState
              icon={ShoppingBasket}
              title="No sales yet"
              description="Your best sellers show up here after the first delivered order."
              action={
                <Link href="/inventory" className={BUTTON.secondary}>
                  Check your inventory
                </Link>
              }
              className="py-12"
            />
          ) : (
            <ol className="flex flex-col divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                        i === 0 ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink" title={p.name}>
                        {p.name}
                      </p>
                      <p className="tnum text-xs text-slate-400">{p.units} sold</p>
                    </div>
                    <span className="tnum shrink-0 text-sm font-semibold text-ink">{formatInr(p.revenue)}</span>
                  </div>
                  <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={clsx('h-full rounded-full', i === 0 ? 'bg-accent' : 'bg-accent/40')}
                      style={{ width: `${topRevenue ? Math.max(4, (p.revenue / topRevenue) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
