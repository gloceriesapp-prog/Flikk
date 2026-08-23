// Revenue's own hero — total earned, this week's trend, and the two
// numbers that round it out: what's still settling and what's already
// sitting ready to withdraw (same split as Overview's BalanceSummaryCard,
// reused here since it's the same wallet, just viewed from the revenue
// side instead of the "founder's own money" side).

import { ArrowDownToLine, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/format';
import type { WalletBalance } from '@/lib/types';

export function RevenueBalanceCard({
  totalRevenue,
  thisWeek,
  weekOverWeekPct,
  wallet,
}: {
  totalRevenue: number;
  thisWeek: number;
  weekOverWeekPct: number;
  wallet: WalletBalance;
}) {
  const isUp = weekOverWeekPct >= 0;

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
            <Wallet size={18} className="text-ink" />
          </div>
          <div>
            <p className="text-sm text-muted">Total commission, all-time</p>
            <p className="text-4xl font-medium tabular-nums text-ink">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          <ArrowDownToLine size={16} />
          Withdraw
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <p className="text-sm text-muted">This week vs. last</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-base font-medium tabular-nums text-ink">{formatCurrency(thisWeek)}</p>
            <span className={clsx('flex items-center gap-0.5 text-xs font-medium', isUp ? 'text-success' : 'text-danger')}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isUp ? '+' : ''}
              {weekOverWeekPct}%
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <p className="text-sm text-muted">Available to withdraw</p>
          <p className="text-base font-medium tabular-nums text-ink">{formatCurrency(wallet.availableToWithdraw)}</p>
        </div>

        <div className="rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <p className="text-sm text-muted">Pending settlement</p>
          <p className="text-base font-medium tabular-nums text-ink">{formatCurrency(wallet.pendingSettlement)}, <span className="text-[11px] font-medium text-muted">{wallet.pendingSettlementNote}</span></p>
        </div>
      </div>
    </div>
  );
}
