'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Search, ShoppingBag, Truck } from 'lucide-react';
import { fetchMyOrders, type OrderStatus, type PartnerOrder } from '@/lib/partnerApi';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { OrdersFilterBar, ORDER_FILTERS, type DateRange } from '@/components/orders/OrdersFilterBar';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { StatTile } from '@/components/ui/StatTile';
import { formatInr, statusLabel } from '@/lib/format';

const RANGE_MS: Record<Exclude<DateRange, 'all' | 'today'>, number> = {
  '7d': 7 * 86400e3,
  '30d': 30 * 86400e3,
};

function inRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const t = new Date(iso).getTime();
  if (range === 'today') return new Date(iso).toDateString() === new Date().toDateString();
  return Date.now() - t <= RANGE_MS[range];
}

// Client-side CSV of whatever the filters currently show. No server round-trip.
function exportCsv(orders: PartnerOrder[]) {
  const head = ['Order', 'Customer', 'Phone', 'Status', 'Amount', 'Placed'];
  const rows = orders.map((o) => [
    o.order_number,
    o.addresses?.recipient_name ?? o.users?.name ?? 'Customer',
    o.users?.phone ?? '',
    statusLabel(o.status),
    formatInr(o.total),
    new Date(o.placed_at).toLocaleString('en-IN'),
  ]);
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, []);

  // DEMO DATA — same isDemo convention as the Overview page: shown only while
  // the store has zero real orders, replaced the instant a real one lands.
  const isDemo = !isLoading && orders.length === 0;
  const sourceOrders = isDemo ? DEMO_ORDERS : orders;

  const sorted = useMemo(
    () => [...sourceOrders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)),
    [sourceOrders],
  );

  const counts = useMemo(() => {
    const result = { all: sorted.length } as Record<OrderStatus | 'all', number>;
    for (const f of ORDER_FILTERS) {
      if (f !== 'all') result[f] = sorted.filter((o) => o.status === f).length;
    }
    return result;
  }, [sorted]);

  // Month-over-month count trend per metric — undefined when there's no prior
  // month to compare against, so the delta pill is hidden rather than printing
  // a meaningless +100%.
  const trends = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    function trend(pred: (o: PartnerOrder) => boolean): number | undefined {
      let tm = 0;
      let lm = 0;
      for (const o of sorted) {
        if (!pred(o)) continue;
        const t = new Date(o.placed_at).getTime();
        if (t >= startThis) tm++;
        else if (t >= startLast) lm++;
      }
      return lm > 0 ? ((tm - lm) / lm) * 100 : undefined;
    }
    const inTransit = (o: PartnerOrder) => o.status === 'packed' || o.status === 'out_for_delivery';
    return {
      total: trend(() => true),
      pending: trend((o) => o.status === 'placed'),
      inTransit: trend(inTransit),
      delivered: trend((o) => o.status === 'delivered'),
      failed: trend((o) => o.status === 'cancelled'),
    };
  }, [sorted]);

  const filtered = useMemo(() => {
    const byRange = sorted.filter((o) => inRange(o.placed_at, dateRange));
    const byStatus = filter === 'all' ? byRange : byRange.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((o) => {
      const customer = (o.addresses?.recipient_name ?? o.users?.name ?? '').toLowerCase();
      const phone = (o.users?.phone ?? '').toLowerCase();
      return customer.includes(q) || phone.includes(q) || o.order_number.toLowerCase().includes(q);
    });
  }, [sorted, filter, dateRange, search]);

  const inTransitCount = counts.packed + counts.out_for_delivery;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, customer, phone…"
            className="w-full rounded-full border border-hairline-strong bg-white py-2.5 pl-11 pr-4 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatTile label="Total orders" value={String(sorted.length)} icon={ShoppingBag} deltaPercent={trends.total} />
        <StatTile label="Pending" value={String(counts.placed)} icon={Clock} deltaPercent={trends.pending} sublabel="To pack" invertTone />
        <StatTile label="In transit" value={String(inTransitCount)} icon={Truck} deltaPercent={trends.inTransit} />
        <StatTile label="Delivered" value={String(counts.delivered)} icon={CheckCircle2} deltaPercent={trends.delivered} />
        <StatTile label="Failed" value={String(counts.cancelled)} icon={AlertCircle} deltaPercent={trends.failed} invertTone />
      </div>

      <OrdersFilterBar
        filter={filter}
        onFilterChange={setFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => exportCsv(filtered)}
      />

      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">Loading orders…</div>
      ) : (
        <OrdersTable orders={filtered} />
      )}
    </div>
  );
}
