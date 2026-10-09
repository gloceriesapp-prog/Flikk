import clsx from 'clsx';
import type { OrderStatus } from '@/lib/types';
import { orderStatusPresentation } from '@/lib/orderStatus';

export function StatusPill({ status }: { status: OrderStatus }) {
  const { label, style } = orderStatusPresentation(status);
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', style)}>{label}</span>;
}
