'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMyOrders, type OrderStatus, type PartnerOrder } from '@/lib/partnerApi';
import { formatInr, formatDateTime, statusColor, statusLabel } from '@/lib/format';
import clsx from 'clsx';

const FILTERS: Array<OrderStatus | 'all'> = ['all', 'placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...orders].sort((a, b) => +new Date(b.placed_at) - +new Date(a.placed_at));
    return filter === 'all' ? sorted : sorted.filter((o) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Orders</h1>
        <p className="mt-1 text-sm text-neutral-500">{orders.length} total</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-medium',
              filter === f ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200',
            )}
          >
            {f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">No orders here.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <div key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {order.addresses?.recipient_name ?? order.users?.name ?? 'Customer'}
                  </p>
                  <p className="text-xs text-neutral-400">{order.users?.phone}</p>
                  <p className="mt-1 text-xs text-neutral-400">{formatDateTime(order.placed_at)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(order.status)}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              <ul className="mt-4 flex flex-col gap-1.5 border-t border-neutral-100 pt-4">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-neutral-600">
                      {item.quantity} × {item.products?.name ?? 'Item'} ({item.products?.unit})
                    </span>
                    <span className="text-neutral-900">{formatInr(item.unit_price_at_order * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm">
                <span className="text-neutral-500">{order.addresses?.line1}</span>
                <span className="font-semibold text-neutral-900">{formatInr(order.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
