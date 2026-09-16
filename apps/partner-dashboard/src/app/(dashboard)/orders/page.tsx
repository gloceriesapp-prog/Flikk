'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Clock, PackageCheck, Truck } from 'lucide-react';
import { fetchMyOrders, type OrderStatus, type PartnerOrder } from '@/lib/partnerApi';
import { DEMO_ORDERS } from '@/lib/demoOrders';
import { StatCard } from '@/components/StatCard';
import { OrdersFilterBar, ORDER_FILTERS } from '@/components/orders/OrdersFilterBar';
import { OrdersTable } from '@/components/orders/OrdersTable';

export default function OrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, []);

  // DEMO DATA — this store has zero real orders, so the table/filters/stat
  // strip would render entirely empty. Same isDemo convention as the
  // Overview page: shown only while orders.length === 0, and replaced the
  // instant a real order lands (this flips false automatically then).
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

  const filtered = useMemo(() => {
    const byStatus = filter === 'all' ? sorted : sorted.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((o) => {
      const customer = (o.addresses?.recipient_name ?? o.users?.name ?? '').toLowerCase();
      return customer.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [sorted, filter, search]);

  const activeCount = counts.placed + counts.packed + counts.out_for_delivery;
  const todaysCount = sorted.filter((o) => new Date(o.placed_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black">Orders</h1>
        <p className="mt-1 text-sm text-neutral-400">Every order placed with your store, in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total orders" value={String(sorted.length)} icon={ClipboardList} iconClassName="bg-neutral-100 text-neutral-600" />
        <StatCard label="Today" value={String(todaysCount)} icon={Clock} iconClassName="bg-blue-50 text-blue-600" />
        <StatCard label="Active" value={String(activeCount)} icon={Truck} iconClassName="bg-violet-50 text-violet-600" />
        <StatCard label="Delivered" value={String(counts.delivered)} icon={PackageCheck} iconClassName="bg-emerald-50 text-emerald-600" />
      </div>

      <OrdersFilterBar filter={filter} onFilterChange={setFilter} search={search} onSearchChange={setSearch} counts={counts} />

      {isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white py-20 text-center text-sm text-neutral-400">Loading orders…</div>
      ) : (
        <OrdersTable orders={filtered} />
      )}
    </div>
  );
}
