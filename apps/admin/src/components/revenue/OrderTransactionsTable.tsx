// Order-level money detail — every order, its full amount, and the slice
// of that amount Flikk actually kept (order.commissionAmount, the real
// orders.commission_amount column). Delivered orders count as earned;
// anything still in flight is "pending" and cancelled orders earned
// nothing, shown at ₹0 rather than hidden, so the table still reconciles
// against Orders' own total count.

import clsx from 'clsx';
import { formatCurrency } from '@/lib/format';
import type { Order } from '@/lib/types';

const EARNED_STATUSES: Order['status'][] = ['delivered'];

export function OrderTransactionsTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-3 pr-4 font-medium">Order</th>
            <th className="pb-3 pr-4 font-medium">Store</th>
            <th className="pb-3 pr-4 font-medium">Placed</th>
            <th className="pb-3 pr-4 font-medium">Order total</th>
            <th className="pb-3 pr-4 font-medium">Commission earned</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const earned = EARNED_STATUSES.includes(order.status);
            const cancelled = order.status === 'cancelled';
            const commission = cancelled ? 0 : order.commissionAmount;

            return (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-ink">{order.id}</td>
                <td className="py-3 pr-4 text-ink-soft">{order.storeName}</td>
                <td className="py-3 pr-4 text-ink-soft">{order.placedAt}</td>
                <td className="py-3 pr-4 tabular-nums text-ink-soft">{formatCurrency(order.amount)}</td>
                <td className={clsx('py-3 pr-4 font-semibold tabular-nums', earned ? 'text-success' : 'text-ink')}>
                  {formatCurrency(commission)}
                </td>
                <td className="py-3">
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      earned && 'bg-green-50 text-success',
                      cancelled && 'bg-red-50 text-danger',
                      !earned && !cancelled && 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {earned ? 'Earned' : cancelled ? 'Cancelled' : 'Pending'}
                  </span>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-muted">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
