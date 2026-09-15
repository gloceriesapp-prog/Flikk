'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMyOrders, fetchMyPayouts, fetchMyStore, type PartnerOrder, type Payout, type Store } from '@/lib/partnerApi';
import { StatCard } from '@/components/StatCard';
import { formatInr, formatDateTime, statusColor, statusLabel } from '@/lib/format';

export default function OverviewPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMyStore(), fetchMyOrders(), fetchMyPayouts()])
      .then(([storeRes, ordersRes, payoutsRes]) => {
        setStore(storeRes);
        setOrders(ordersRes);
        setPayouts(payoutsRes);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.placed_at).toDateString() === today);
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingPayout = payouts.find((p) => p.status === 'pending' || p.status === 'processing');
  const recentOrders = [...orders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at)).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{store?.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {store?.is_active ? 'Open for orders' : 'Closed'} · {store?.district ?? 'No district set'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active orders" value={String(activeOrders.length)} />
        <StatCard label="Today's orders" value={String(todaysOrders.length)} />
        <StatCard label="Today's revenue" value={formatInr(todaysRevenue)} />
        <StatCard
          label="Next payout"
          value={pendingPayout ? formatInr(pendingPayout.net_payout) : '—'}
          hint={pendingPayout ? statusLabel(pendingPayout.status) : 'No pending payout'}
        />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <p className="text-sm font-semibold text-neutral-900">Recent orders</p>
          <Link href="/orders" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-400">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{order.addresses?.recipient_name ?? order.users?.name ?? 'Customer'}</p>
                  <p className="text-xs text-neutral-400">{formatDateTime(order.placed_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-900">{formatInr(order.total)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
