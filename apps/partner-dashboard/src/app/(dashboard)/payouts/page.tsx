'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Calendar, HandCoins, Percent, ReceiptText, Wallet } from 'lucide-react';
import { fetchMyCommission, fetchMyPayouts, fetchMyStore, type PartnerCommission, type Store } from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { DEMO_PAYOUTS } from '@/lib/demoPayouts';
import { Card } from '@/components/ui/Card';
import { MetricCard, MetricGrid } from '@/components/inventory/MetricCard';
import { EmptyState, ErrorState, MetricGridSkeleton, RowsSkeleton, Skeleton } from '@/components/inventory/DataStates';
import { formatInr } from '@/lib/format';
import { PayoutDestinationCard } from '@/components/payouts/PayoutDestinationCard';
import { PayoutsFilterBar, PAYOUT_FILTERS, type PayoutFilter } from '@/components/payouts/PayoutsFilterBar';
import { PayoutsTable, formatWeek } from '@/components/payouts/PayoutsTable';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

// Payouts move at most once a week — a slow poll keeps a newly-marked-paid row
// in sync without hammering the endpoint. The hook pauses it while hidden.
const PAYOUTS_POLL_MS = 60_000;

export default function PayoutsPage() {
  const { data: payoutsData, isLoading, error, refetch } = useLiveData(fetchMyPayouts, PAYOUTS_POLL_MS);
  const payoutsRaw = useMemo(() => payoutsData ?? [], [payoutsData]);
  // Only a failed FIRST load is an error state — a failed background poll
  // keeps showing the last good rows.
  const loadError = !!error && payoutsData === undefined;
  const payouts = useMemo(
    () => [...payoutsRaw].sort((a, b) => +new Date(b.week_start) - +new Date(a.week_start)),
    [payoutsRaw],
  );
  const [store, setStore] = useState<Store | null>(null);
  const [commission, setCommission] = useState<PartnerCommission | null>(null);
  const [storeSettled, setStoreSettled] = useState(false);
  const [filter, setFilter] = useState<PayoutFilter>('all');

  useEffect(() => {
    // Store + rate change rarely — one-time fetch, best-effort (the rate line
    // just stays hidden if it fails).
    fetchMyStore()
      .then(setStore)
      .catch(() => setStore(null))
      .finally(() => setStoreSettled(true));
    fetchMyCommission().then(setCommission).catch(() => setCommission(null));
  }, []);

  // DEMO DATA — this store has zero real payout history, so the table/
  // filters/stat strip would render entirely empty. Same isDemo convention
  // as Overview/Orders/Inventory: shown only while payouts.length === 0,
  // gone the instant a real payout row exists. The payout DESTINATION card
  // below is never part of this — see its own note on why.
  const isDemo = DEMO_DATA_ENABLED && !isLoading && payouts.length === 0;
  const sourcePayouts = isDemo ? DEMO_PAYOUTS : payouts;

  const counts = useMemo(() => {
    const result = { all: sourcePayouts.length } as Record<PayoutFilter, number>;
    for (const f of PAYOUT_FILTERS) {
      if (f !== 'all') result[f] = sourcePayouts.filter((p) => p.status === f).length;
    }
    return result;
  }, [sourcePayouts]);

  const filtered = useMemo(
    () => (filter === 'all' ? sourcePayouts : sourcePayouts.filter((p) => p.status === filter)),
    [sourcePayouts, filter],
  );

  const lifetimePaid = sourcePayouts.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.net_payout, 0);
  const pendingAmount = sourcePayouts
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.net_payout, 0);
  // The settlement Gloceries will pay next: one already processing first,
  // otherwise the oldest pending week. Payouts carry no payment date, so the
  // tile shows the amount and the week it covers, never a guessed date.
  const queued = sourcePayouts
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .sort((a, b) => (a.status === b.status ? a.week_start.localeCompare(b.week_start) : a.status === 'processing' ? -1 : 1));
  const nextPayout = queued[0];
  const needsAttention = counts.blocked + counts.failed;

  const ratePercent = commission ? Math.round(commission.commissionRate * 10000) / 100 : null;

  let body: ReactNode;
  if (isLoading) {
    body = <RowsSkeleton rows={5} leading={false} />;
  } else if (loadError && !isDemo) {
    body = <ErrorState title="Couldn’t load your payouts" onRetry={() => void refetch()} />;
  } else if (sourcePayouts.length === 0) {
    body = (
      <EmptyState
        icon={ReceiptText}
        title="No payouts yet"
        description="Your first weekly settlement appears here after a week of delivered orders."
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={ReceiptText}
        title={`No ${filter} payouts`}
        description="Nothing in this status right now."
        action={
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Show all payouts
          </button>
        }
      />
    );
  } else {
    body = <PayoutsTable payouts={filtered} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Where the money goes + what Gloceries keeps. The destination card is
          never demo-faked (see its own note). */}
      <div className="grid gap-4 lg:grid-cols-3">
        {!storeSettled ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-white p-5 lg:col-span-2">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ) : (
          store && <PayoutDestinationCard store={store} className={commission ? 'lg:col-span-2' : 'lg:col-span-3'} />
        )}
        {commission && ratePercent !== null && (
          <div className={`flex items-center gap-3 rounded-[20px] bg-white p-5 ${store || !storeSettled ? '' : 'lg:col-span-3'}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Percent size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Gloceries commission{commission.isStoreOverride ? ' · your store’s rate' : ''}</p>
              <p className="text-[15px] font-semibold text-ink">
                <span className="tnum">{ratePercent}%</span>
                <span className="font-normal text-slate-500"> of the item total on each new order</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <MetricGridSkeleton />
      ) : (
        !loadError && (
          <MetricGrid>
            <MetricCard label="Lifetime paid" value={formatInr(lifetimePaid)} icon={Wallet} tone="green" sublabel="Settled to your account" />
            <MetricCard label="Pending" value={formatInr(pendingAmount)} icon={HandCoins} tone="amber" sublabel="Pending + processing" />
            <MetricCard
              label="Next payout"
              value={nextPayout ? formatInr(nextPayout.net_payout) : '—'}
              icon={Calendar}
              tone="blue"
              sublabel={
                nextPayout
                  ? `For ${formatWeek(nextPayout.week_start, nextPayout.week_end)} · ${nextPayout.status === 'processing' ? 'Processing' : 'Pending'}`
                  : 'Nothing queued'
              }
            />
            <MetricCard
              label="Needs attention"
              value={needsAttention}
              icon={AlertCircle}
              tone={needsAttention > 0 ? 'red' : 'green'}
              sublabel={needsAttention > 0 ? 'Blocked or failed' : 'All clear'}
            />
          </MetricGrid>
        )
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">Payout history</h2>
            <p className="text-sm text-slate-500">One settlement for each week of delivered orders.</p>
          </div>
          {!isLoading && !loadError && <PayoutsFilterBar filter={filter} onFilterChange={setFilter} counts={counts} />}
        </div>
        {body}
      </Card>
    </div>
  );
}
