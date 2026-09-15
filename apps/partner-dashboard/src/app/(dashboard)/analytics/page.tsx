'use client';

// No backend aggregation endpoint exists for partner analytics yet — this
// computes everything client-side from the same real /partner/orders and
// /partner/products data the Orders/Inventory pages already use. Fine at
// current single-store order volume; move to a real backend rollup if a
// store's order count grows large enough for this to matter.

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchMyOrders, type PartnerOrder } from '@/lib/partnerApi';
import { StatCard } from '@/components/StatCard';
import { formatInr } from '@/lib/format';

const DAYS_WINDOW = 14;

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, []);

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
        bucket.revenue += order.total;
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
        existing.revenue += item.unit_price_at_order * item.quantity;
        existing.units += item.quantity;
        totals.set(name, existing);
      }
    }
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [delivered]);

  const totalRevenue = delivered.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = delivered.length ? totalRevenue / delivered.length : 0;
  const cancelledCount = orders.length - delivered.length;

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">Last {DAYS_WINDOW} days, computed from your orders</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total revenue" value={formatInr(totalRevenue)} hint="all-time" />
        <StatCard label="Orders" value={String(delivered.length)} hint="all-time, excl. cancelled" />
        <StatCard label="Avg. order value" value={formatInr(avgOrderValue)} />
        <StatCard label="Cancelled" value={String(cancelledCount)} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-neutral-900">Revenue, last {DAYS_WINDOW} days</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={1} />
            <YAxis tick={{ fontSize: 12 }} width={48} />
            <Tooltip formatter={(v) => formatInr(Number(v))} />
            <Line type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-neutral-900">Order volume, last {DAYS_WINDOW} days</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={1} />
            <YAxis tick={{ fontSize: 12 }} width={32} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orders" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-5 py-4">
          <p className="text-sm font-semibold text-neutral-900">Top products by revenue</p>
        </div>
        {topProducts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {topProducts.map((p) => (
              <li key={p.name} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="text-neutral-700">{p.name}</span>
                <span className="text-neutral-400">{p.units} sold</span>
                <span className="font-medium text-neutral-900">{formatInr(p.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
