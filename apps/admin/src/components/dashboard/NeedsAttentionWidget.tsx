'use client';

// Home snapshot's own addition, not in the original A1-A4 spec — "orders
// stuck too long / no rider yet" is exactly the kind of thing a founder
// needs surfaced without hunting for it across the Orders and Riders
// screens separately. Full-width, wait time gets a real urgency scale
// (amber past the threshold, red past double it) instead of one flat
// warning color for every row.
//
// Real data now — app/api/orders (already real, shared with Orders/Riders
// pages), same shape/minutesSinceStatusChange this app's own Order type
// already computes server-side. Was PLACEHOLDER_ORDERS before: a fixed
// fake list that never matched what the real Orders page showed.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { ATTENTION_THRESHOLD_MINUTES } from '@/lib/mock-data';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';
import type { Order } from '@/lib/types';

export function NeedsAttentionWidget() {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadOrders);
  }, [loadOrders]);
  useAdminRealtime(loadOrders);

  const flagged = orders
    .filter(
      (o) =>
        (o.status === 'placed' || o.status === 'packed') &&
        !o.riderId &&
        o.minutesSinceStatusChange >= ATTENTION_THRESHOLD_MINUTES,
    )
    .sort((a, b) => b.minutesSinceStatusChange - a.minutesSinceStatusChange);

  return (
    <Card
      title="Needs attention"
      subtitle={`Stuck ${ATTENTION_THRESHOLD_MINUTES}+ min with no rider assigned`}
      action={
        flagged.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger/10 px-2 text-xs font-bold text-danger">
            {flagged.length}
          </span>
        )
      }
    >
      {flagged.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">All caught up — nothing stuck right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flagged.map((order) => {
            const critical = order.minutesSinceStatusChange >= ATTENTION_THRESHOLD_MINUTES * 2;
            return (
              <div
                key={order.id}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border p-3.5',
                  critical ? 'border-red-100 bg-red-50/60' : 'border-amber-100 bg-amber-50/60',
                )}
              >
                <div
                  className={clsx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    critical ? 'bg-red-100' : 'bg-amber-100',
                  )}
                >
                  <AlertTriangle size={16} className={critical ? 'text-danger' : 'text-amber-600'} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{order.storeName}</p>
                  <p className={clsx('text-xs font-medium', critical ? 'text-danger' : 'text-amber-700')}>
                    {order.id.slice(0, 8).toUpperCase()} · waiting {order.minutesSinceStatusChange} min
                  </p>
                </div>

                <Link
                  href="/riders"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Assign
                  <ArrowRight size={12} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
