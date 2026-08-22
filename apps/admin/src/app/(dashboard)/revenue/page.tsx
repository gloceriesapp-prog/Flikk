'use client';

// Revenue — how much money the platform actually made (commission trend),
// distinct from Payouts (A4/FR23, what each store is owed from that same
// money) and Settlement History (A4's paid-cycle log) — three related
// views, tabbed on one screen since they're all "the money" to a founder.

import { useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { RevenueTrendChart } from '@/components/revenue/RevenueTrendChart';
import { PayoutsTable } from '@/components/revenue/PayoutsTable';
import { formatCurrency } from '@/lib/format';
import { PLACEHOLDER_PAYOUTS, PLACEHOLDER_REVENUE_TREND } from '@/lib/mock-data';

const TABS = ['Overview', 'Payouts', 'Settlement history'] as const;

export default function RevenuePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');

  const totalRevenue = PLACEHOLDER_REVENUE_TREND.reduce((sum, p) => sum + p.commission, 0);
  const latest = PLACEHOLDER_REVENUE_TREND[PLACEHOLDER_REVENUE_TREND.length - 1];
  const prior = PLACEHOLDER_REVENUE_TREND[PLACEHOLDER_REVENUE_TREND.length - 2];
  const weekOverWeekPct = prior ? Math.round(((latest.commission - prior.commission) / prior.commission) * 100) : 0;

  const pendingPayouts = PLACEHOLDER_PAYOUTS.filter((p) => p.status === 'pending');
  const paidPayouts = PLACEHOLDER_PAYOUTS.filter((p) => p.status === 'paid');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink">Revenue</h1>
          <p className="text-sm text-muted">How much Flikk earned, and what&apos;s owed back to stores.</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              tab === t ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-xs text-muted">Total commission, all-time</p>
              <p className="text-3xl font-bold tabular-nums text-ink">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-xs text-muted">This week vs. last</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums text-ink">{formatCurrency(latest.commission)}</p>
                <span className="flex items-center gap-1 text-xs font-semibold text-success">
                  <TrendingUp size={13} />
                  {weekOverWeekPct >= 0 ? '+' : ''}
                  {weekOverWeekPct}%
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-ink">Commission by week</h3>
            <RevenueTrendChart />
          </div>
        </div>
      )}

      {tab === 'Payouts' && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink">Pending this cycle</h3>
          <PayoutsTable payouts={pendingPayouts} emptyLabel="Nothing pending — everyone's been paid." />
        </div>
      )}

      {tab === 'Settlement history' && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink">Paid settlements</h3>
          <PayoutsTable payouts={paidPayouts} emptyLabel="No settlements recorded yet." />
        </div>
      )}
    </div>
  );
}
