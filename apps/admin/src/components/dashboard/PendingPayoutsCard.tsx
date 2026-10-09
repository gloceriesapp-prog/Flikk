// Overview's money card — what the founder still owes stores and riders
// this cycle, straight from the payouts / rider_payouts ledger (GET
// /api/payouts?status=pending). Paying happens on the Payouts page.

import Link from 'next/link';
import { ArrowRight, ShieldAlert, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatRupees, sumRupees } from '@/lib/format';
import type { AdminPayoutRow } from '@/lib/types';

export function PendingPayoutsCard({ rows }: { rows: AdminPayoutRow[] | null }) {
  const total = rows ? sumRupees(rows.map((r) => r.netAmount)) : null;
  const payees = rows ? new Set(rows.map((r) => `${r.kind}:${r.payeeId}`)).size : 0;
  const unverified = rows ? new Set(rows.filter((r) => r.verification !== 'verified').map((r) => `${r.kind}:${r.payeeId}`)).size : 0;

  return (
    <Card title="Pending payouts" subtitle="Owed to stores and riders">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-4xl font-medium tabular-nums text-ink">{total === null ? '—' : formatRupees(total)}</span>
          <p className="mt-1 text-sm text-muted">{rows ? 'Paid manually, recorded with the bank UTR.' : 'Loading…'}</p>
        </div>
        <Link
          href="/payouts"
          className="flex shrink-0 items-center gap-2 rounded-full bg-[#155DFC] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          Open payouts
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <Users size={14} className="text-ink-soft" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums text-ink">{payees}</p>
            <p className="text-[11px] text-muted">Payees waiting</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <ShieldAlert size={14} className="text-ink-soft" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums text-ink">{unverified}</p>
            <p className="text-[11px] text-muted">Unverified payout accounts</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
