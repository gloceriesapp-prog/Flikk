'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, HandCoins, Percent, Wallet } from 'lucide-react';
import { fetchMyCommission, fetchMyPayouts, fetchMyStore, type PartnerCommission, type Store } from '@/lib/partnerApi';
import { useLiveData } from '@/lib/useLiveData';
import { DEMO_PAYOUTS } from '@/lib/demoPayouts';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { formatInr, formatDate } from '@/lib/format';
import { PayoutDestinationCard } from '@/components/payouts/PayoutDestinationCard';
import { PayoutsFilterBar, PAYOUT_FILTERS, type PayoutFilter } from '@/components/payouts/PayoutsFilterBar';
import { PayoutsTable } from '@/components/payouts/PayoutsTable';
import { DEMO_DATA_ENABLED } from '@/lib/demoMode';

// Payouts move at most once a week — a slow poll keeps a newly-marked-paid row
// in sync without hammering the endpoint. The hook pauses it while hidden.
const PAYOUTS_POLL_MS = 60_000;

export default function PayoutsPage() {
  const { data: payoutsRaw = [], isLoading } = useLiveData(fetchMyPayouts, PAYOUTS_POLL_MS);
  const payouts = useMemo(
    () => [...payoutsRaw].sort((a, b) => +new Date(b.week_start) - +new Date(a.week_start)),
    [payoutsRaw],
  );
  const [store, setStore] = useState<Store | null>(null);
  const [commission, setCommission] = useState<PartnerCommission | null>(null);
  const [filter, setFilter] = useState<PayoutFilter>('all');

  useEffect(() => {
    // Store + rate change rarely — one-time fetch, best-effort (the rate line
    // just stays hidden if it fails).
    fetchMyStore().then(setStore).catch(() => setStore(null));
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
  const nextPayout = sourcePayouts.find((p) => p.status === 'pending' || p.status === 'processing');
  const needsAttention = counts.blocked + counts.failed;

  return (
    <div className="flex flex-col gap-6">
      {store && <PayoutDestinationCard store={store} />}

      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-white md:grid-cols-4 md:divide-y-0">
          <StatTile label="Lifetime paid" value={formatInr(lifetimePaid)} icon={Wallet} />
          <StatTile label="Pending" value={formatInr(pendingAmount)} icon={HandCoins} />
          <StatTile label="Next payout" value={nextPayout ? formatDate(nextPayout.week_end) : '—'} icon={Calendar} />
          <StatTile label="Needs attention" value={String(needsAttention)} icon={AlertCircle} sublabel={needsAttention > 0 ? 'Blocked or failed' : 'All clear'} />
        </div>

      {commission && (
        <p className="flex items-center gap-1.5 text-sm text-neutral-500">
          <Percent size={14} />
          Gloceries commission: {Math.round(commission.commissionRate * 10000) / 100}% of the item total on each new order
          {commission.isStoreOverride ? ' (your store’s rate)' : ''}.
        </p>
      )}

      <PayoutsFilterBar filter={filter} onFilterChange={setFilter} counts={counts} />

      {isLoading ? (
        <Card className="py-20 text-center text-sm text-neutral-400">Loading payouts…</Card>
      ) : (
        <PayoutsTable payouts={filtered} />
      )}
    </div>
  );
}
