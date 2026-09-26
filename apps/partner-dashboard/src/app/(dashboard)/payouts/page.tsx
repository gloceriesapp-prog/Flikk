'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, HandCoins, Wallet } from 'lucide-react';
import { fetchMyPayouts, fetchMyStore, type Payout, type Store } from '@/lib/partnerApi';
import { DEMO_PAYOUTS } from '@/lib/demoPayouts';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
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
      {store && <PayoutDestinationCard store={store} />}

      <div className="grid grid-cols-2 divide-x divide-y divide-hairline overflow-hidden rounded-xl border border-hairline md:grid-cols-4 md:divide-y-0">
          <StatTile label="Lifetime paid" value={formatInr(lifetimePaid)} icon={Wallet} />
          <StatTile label="Pending" value={formatInr(pendingAmount)} icon={HandCoins} />
          <StatTile label="Next payout" value={nextPayout ? formatDate(nextPayout.week_end) : '—'} icon={Calendar} />
          <StatTile label="Needs attention" value={String(needsAttention)} icon={AlertCircle} sublabel={needsAttention > 0 ? 'Blocked or failed' : 'All clear'} />
        </div>

      <PayoutsFilterBar filter={filter} onFilterChange={setFilter} counts={counts} />

      {isLoading ? (
        <Card className="py-20 text-center text-sm text-neutral-400">Loading payouts…</Card>
      ) : (
        <PayoutsTable payouts={filtered} />
      )}
    </div>
  );
}
