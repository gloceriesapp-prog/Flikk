// Revenue's own hero — total earned, this week's trend, and what's still
// owed out to stores and riders (pending payouts ledger, same source as
// Overview's PendingPayoutsCard).

import Link from 'next/link';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatRupees } from '@/lib/format';

export function RevenueBalanceCard({
  totalRevenue,
  totalCommission,
  totalPlatformFee,
  thisWeek,
  weekOverWeekPct,
  pendingPayouts,
  commissionRate,
}: {
  totalRevenue: number;
  // Two real, separate income sources rolled into totalRevenue above —
  // shown as their own line so "how much did we earn" and "from what"
  // read together. Commission comes from stores (item_total x rate);
  // platform fee comes from customers (the handling fee every checkout
  // already charges) — neither is ever paid to a store or a rider.
  totalCommission: number;
  totalPlatformFee: number;
  thisWeek: number;
  weekOverWeekPct: number;
  // Sum of pending store + rider payouts (null while loading).
  pendingPayouts: number | null;
  // Real, admin-editable rate (Settings -> Platform fees) — shown right
  // next to the number it produces so "how much did we earn" and "why"
  // read together, not as two disconnected screens.
  commissionRate: number | null;
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted">Total earned, all-time</p>
              {commissionRate !== null && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                  {(commissionRate * 100).toFixed(1)}% commission
                </span>
              )}
            </div>
            <p className="text-4xl font-medium tabular-nums text-ink">{formatCurrency(totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted">
              {formatCurrency(totalCommission)} commission (stores) + {formatCurrency(totalPlatformFee)} platform fee
              (customers)
            </p>
          </div>
        </div>

      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          <p className="text-sm text-muted">
            Pending payouts ·{' '}
            <Link href="/payouts" className="font-medium text-ink-soft underline-offset-2 hover:underline">
              pay now
            </Link>
          </p>
          <p className="text-base font-medium tabular-nums text-ink">{pendingPayouts === null ? '—' : formatRupees(pendingPayouts)}</p>
        </div>
      </div>
    </div>
  );
}
