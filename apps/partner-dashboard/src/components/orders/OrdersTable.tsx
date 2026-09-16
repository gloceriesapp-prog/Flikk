'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { PartnerOrder } from '@/lib/partnerApi';
import { formatInr, formatDateTime, statusColor, statusLabel } from '@/lib/format';
import { paymentStatus } from '@/lib/orderPayment';
import { avatarColorFor, initialsFor } from '@/lib/avatar';
import { ItemAvatars } from '@/components/ItemAvatars';

const COLUMNS = '1.7fr 1.2fr 0.9fr 0.8fr 0.9fr 1.1fr 32px';

export function OrdersTable({ orders }: { orders: PartnerOrder[] }) {
  const router = useRouter();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-neutral-200 bg-white py-20">
        <p className="text-sm font-medium text-neutral-700">No orders match this view.</p>
        <p className="text-sm text-neutral-400">Try a different filter or search term.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div
        className="grid gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        <span>Customer</span>
        <span>Items</span>
        <span>Amount</span>
        <span>Payment</span>
        <span>Status</span>
        <span>Placed</span>
        <span />
      </div>

      <div>
        {orders.map((order) => {
          const customerName = order.addresses?.recipient_name ?? order.users?.name ?? 'Customer';
          const payment = paymentStatus(order);
          return (
            <div
              key={order.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/orders/${order.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders/${order.id}`)}
              className="grid cursor-pointer items-center gap-3 border-b border-neutral-100 px-5 py-[18px] transition-colors last:border-b-0 hover:bg-neutral-50/70"
              style={{ gridTemplateColumns: COLUMNS }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColorFor(customerName)}`}
                >
                  {initialsFor(customerName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-neutral-900">{customerName}</p>
                  <p className="truncate text-xs text-neutral-400">{order.users?.phone}</p>
                </div>
              </div>

              <ItemAvatars
                images={order.order_items.slice(0, 3).map((item) => item.products?.image_url ?? null)}
                count={order.order_items.length}
              />

              <span className="text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(order.total)}</span>

              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${payment.className}`}>
                {payment.label}
              </span>

              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusColor(order.status)}`}>
                {statusLabel(order.status)}
              </span>

              <span className="text-sm whitespace-nowrap text-neutral-400">{formatDateTime(order.placed_at)}</span>

              <ChevronRight size={16} className="text-neutral-300" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
