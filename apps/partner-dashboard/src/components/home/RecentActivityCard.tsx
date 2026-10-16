import clsx from 'clsx';
import { History } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr, statusColor, statusLabel } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { CardLabel, CornerLink, Thumb } from './parts';
import { firstItemImage, itemCount, lastActivityAt, timeAgo } from './dashboardData';

const MAX_ROWS = 5;

// Latest movement across all orders (placed, packed, picked up, delivered),
// newest first: thumbnail, order number, amount, when, and a status pill.
export function RecentActivityCard({ orders, now }: { orders: PartnerOrder[]; now: number }) {
  const recent = [...orders]
    .sort((a, b) => +new Date(lastActivityAt(b)) - +new Date(lastActivityAt(a)))
    .slice(0, MAX_ROWS);

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <CardLabel icon={History} className="text-lg text-ink">
          Recent activity
        </CardLabel>
        <CornerLink href="/orders" label="Open all orders" />
      </div>

      {recent.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm text-slate-400">
          Orders will appear here as they come in.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {recent.map((order) => {
            const units = itemCount(order);
            return (
              <li key={order.id} className="flex items-center gap-3.5 py-3.5 last:pb-0">
                <Thumb src={firstItemImage(order)} name={order.order_items[0]?.products?.name ?? order.order_number} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">#{order.order_number}</p>
                  <p className="tnum mt-0.5 truncate text-sm text-slate-500">
                    {formatInr(order.total)} · {units} {units === 1 ? 'item' : 'items'} · {timeAgo(lastActivityAt(order), now)}
                  </p>
                </div>
                <span
                  className={clsx(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                    statusColor(order.status),
                  )}
                >
                  {statusLabel(order.status)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
