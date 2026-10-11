'use client';

// No backend aggregation endpoint exists for partner analytics yet — this
// computes everything client-side from the same real /partner/orders and
// /partner/products data the Orders/Inventory pages already use. Fine at
// current single-store order volume; move to a real backend rollup if a
// store's order count grows large enough for this to matter.

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, ListOrdered, Receipt, Wallet } from 'lucide-react';
import { fetchMyOrders } from '@/lib/partnerApi';
import { orderNetRevenue, lineNetRevenue } from '@/lib/orderRevenue';
import { useLiveData } from '@/lib/useLiveData';
import { SectionCard } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { formatInr } from '@/lib/format';

const DAYS_WINDOW = 14;
// Historical rollups move slowly — poll lightly, and the hook pauses it while
// the tab is hidden.
const ANALYTICS_POLL_MS = 60_000;

export default function AnalyticsPage() {
  const { data: orders = [], isLoading } = useLiveData(fetchMyOrders, ANALYTICS_POLL_MS);

  const delivered = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);

  const dailySeries = useMemo(() => {
    const days: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = DAYS_WINDOW - 1; i >= 0; i--) {
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
  }, [delivered]);

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

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline md:grid-cols-4 md:divide-y-0">
          <StatTile label="Net revenue" value={formatInr(totalRevenue)} sublabel="all-time, net of commission" icon={Wallet} />
          <StatTile label="Orders" value={String(delivered.length)} sublabel="all-time, excl. cancelled" icon={ListOrdered} />
          <StatTile label="Avg. order value" value={formatInr(avgOrderValue)} sublabel="net" icon={Receipt} />
          <StatTile label="Cancelled" value={String(cancelledCount)} icon={Ban} />
        </div>

      <SectionCard title={`Revenue, last ${DAYS_WINDOW} days`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a3a3a3' }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fontSize: 12, fill: '#a3a3a3' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(v) => formatInr(Number(v))} />
            <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title={`Order volume, last ${DAYS_WINDOW} days`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#a3a3a3' }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fontSize: 12, fill: '#a3a3a3' }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orders" fill="#d4d4d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Top products by revenue" bodyClassName="">
        {topProducts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {topProducts.map((p) => (
              <li key={p.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 text-sm">
                <span className="truncate text-neutral-700">{p.name}</span>
                <span className="text-neutral-400 tabular-nums">{p.units} sold</span>
                <span className="tnum w-24 text-right font-semibold text-neutral-900">{formatInr(p.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
