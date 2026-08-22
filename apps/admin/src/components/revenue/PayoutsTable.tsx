import { formatCurrency } from '@/lib/format';
import type { Payout } from '@/lib/types';

export function PayoutsTable({ payouts, emptyLabel }: { payouts: Payout[]; emptyLabel: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-3 pr-4 font-medium">Store</th>
            <th className="pb-3 pr-4 font-medium">Cycle</th>
            <th className="pb-3 pr-4 font-medium">Gross sales</th>
            <th className="pb-3 pr-4 font-medium">Commission</th>
            <th className="pb-3 pr-4 font-medium">Net payout</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium text-ink">{payout.storeName}</td>
              <td className="py-3 pr-4 text-ink-soft">{payout.cycleLabel}</td>
              <td className="py-3 pr-4 tabular-nums text-ink-soft">{formatCurrency(payout.grossSales)}</td>
              <td className="py-3 pr-4 tabular-nums text-ink-soft">{Math.round(payout.commissionRate * 100)}%</td>
              <td className="py-3 pr-4 font-semibold tabular-nums text-ink">{formatCurrency(payout.netPayout)}</td>
              <td className="py-3">
                <span
                  className={
                    payout.status === 'paid'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success'
                      : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700'
                  }
                >
                  {payout.status === 'paid' ? `Paid · ${payout.paidAt}` : 'Pending'}
                </span>
              </td>
            </tr>
          ))}
          {payouts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
