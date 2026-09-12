// Overview's hero card — a founder's actual wallet, nothing else. Active
// stores / pending orders don't belong here (they're operational, not
// financial — and already live in the header stat row); what replaces
// them is what a real payout wallet always shows next to "available":
// money still settling, and where "Withdraw" actually sends it.
//
// Real data via props now (Overview page's own fetch from app/api/balance
// — RazorpayX's live account balance + the payouts table). `configured`
// false means this project has no RazorpayX current account provisioned
// yet (RAZORPAYX_ACCOUNT_NUMBER unset) — shown honestly rather than a
// fabricated number. Bank account (name/last4) has no real data source
// (Razorpay doesn't expose a merchant's own settlement bank via this API)
// and stays a static display value until one exists.

import { ArrowDownToLine, Building2, Clock3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/format';

export interface BalanceSummary {
  configured: boolean;
  availableToWithdraw: number | null;
  lastWithdrawnAmount: number | null;
  lastWithdrawnAt: string | null;
  pendingSettlement: number;
}

export function BalanceSummaryCard({ balance }: { balance: BalanceSummary | null }) {
  return (
    <Card title="Balance" subtitle="Available to withdraw" showMenu>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium tabular-nums text-ink">
              {balance?.configured && balance.availableToWithdraw !== null ? formatCurrency(balance.availableToWithdraw) : '—'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {!balance ? 'Loading…' : !balance.configured ? 'RazorpayX current account not configured yet.' : balance.lastWithdrawnAt
              ? `Last withdrawn ${formatCurrency(balance.lastWithdrawnAmount ?? 0)} on ${formatDateTime(balance.lastWithdrawnAt)}`
              : 'No withdrawals yet.'}
          </p>
        </div>

        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          <ArrowDownToLine size={16} />
          Withdraw
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <Clock3 size={14} className="text-ink-soft" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums text-ink">{formatCurrency(balance?.pendingSettlement ?? 0)}</p>
            <p className="text-[11px] text-muted">Pending settlement · store payouts queued this week</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <Building2 size={14} className="text-ink-soft" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">Payout account</p>
            <p className="text-[11px] text-muted">RazorpayX current account</p>
          </div>
          <button type="button" className="text-[11px] font-semibold text-ink-soft hover:text-ink">
            Change
          </button>
        </div>
      </div>
    </Card>
  );
}
