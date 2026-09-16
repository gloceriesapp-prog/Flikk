'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, HandCoins, Wallet } from 'lucide-react';
import { fetchMyPayouts, fetchMyStore, type Payout, type Store } from '@/lib/partnerApi';
import { DEMO_PAYOUTS } from '@/lib/demoPayouts';
import { StatCard } from '@/components/StatCard';
import { formatInr, formatDate } from '@/lib/format';
import { PayoutDestinationCard } from '@/components/payouts/PayoutDestinationCard';
import { PayoutsFilterBar, PAYOUT_FILTERS, type PayoutFilter } from '@/components/payouts/PayoutsFilterBar';
import { PayoutsTable } from '@/components/payouts/PayoutsTable';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PayoutFilter>('all');

  useEffect(() => {
    Promise.all([fetchMyPayouts(), fetchMyStore()])
      .then(([payoutsRes, storeRes]) => {
        setPayouts([...payoutsRes].sort((a, b) => +new Date(b.week_start) - +new Date(a.week_start)));
        setStore(storeRes);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // DEMO DATA — this store has zero real payout history, so the table/
  // filters/stat strip would render entirely empty. Same isDemo convention
  // as Overview/Orders/Inventory: shown only while payouts.length === 0,
  // gone the instant a real payout row exists. The payout DESTINATION card
  // below is never part of this — see its own note on why.
  const isDemo = !isLoading && payouts.length === 0;
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black">Payouts</h1>
        <p className="mt-1 text-sm text-neutral-400">Your weekly settlements, and where they land.</p>
      </div>

      {store && <PayoutDestinationCard store={store} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Lifetime paid" value={formatInr(lifetimePaid)} icon={Wallet} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatCard label="Pending" value={formatInr(pendingAmount)} icon={HandCoins} iconClassName="bg-amber-50 text-amber-600" />
        <StatCard
          label="Next payout"
          value={nextPayout ? formatDate(nextPayout.week_end) : '—'}
          icon={Calendar}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Needs attention"
          value={String(needsAttention)}
          icon={AlertCircle}
          iconClassName={needsAttention > 0 ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600'}
        />
      </div>

      <PayoutsFilterBar filter={filter} onFilterChange={setFilter} counts={counts} />

      {isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white py-20 text-center text-sm text-neutral-400">Loading payouts…</div>
      ) : (
        <PayoutsTable payouts={filtered} />
      )}
    </div>
  );
}
