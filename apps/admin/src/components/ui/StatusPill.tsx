import clsx from 'clsx';
import type { OrderStatus } from '@/lib/types';

const STYLES: Record<OrderStatus, string> = {
  placed: 'bg-accent text-ink-soft',
  packed: 'bg-amber-50 text-amber-700',
  out_for_delivery: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-success',
  cancelled: 'bg-red-50 text-danger',
  failed: 'bg-orange-50 text-orange-700',
};

const LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  packed: 'Packed',
  out_for_delivery: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Delivery failed',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
