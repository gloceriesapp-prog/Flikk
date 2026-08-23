// Overview's hero card — a founder's actual wallet, nothing else. Active
// stores / pending orders don't belong here (they're operational, not
// financial — and already live in the header stat row); what replaces
// them is what a real payout wallet always shows next to "available":
// money still settling, and where "Withdraw" actually sends it.

import { ArrowDownToLine, Building2, Clock3, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';
import { PLACEHOLDER_WALLET } from '@/lib/mock-data';

export function BalanceSummaryCard() {
  return (
    <Card title="Balance" subtitle="Available to withdraw" showMenu>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium tabular-nums text-ink">
              {formatCurrency(PLACEHOLDER_WALLET.availableToWithdraw)}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-success">
              <TrendingUp size={13} />
              +18.4%
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Last withdrawn {formatCurrency(PLACEHOLDER_WALLET.lastWithdrawnAmount)} on {PLACEHOLDER_WALLET.lastWithdrawnAt}
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
            <p className="text-base font-semibold tabular-nums text-ink">
              {formatCurrency(PLACEHOLDER_WALLET.pendingSettlement)}
            </p>
            <p className="text-[11px] text-muted">Pending settlement · {PLACEHOLDER_WALLET.pendingSettlementNote}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
            <Building2 size={14} className="text-ink-soft" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              {PLACEHOLDER_WALLET.bankName} •••• {PLACEHOLDER_WALLET.bankAccountLast4}
            </p>
            <p className="text-[11px] text-muted">Payout account</p>
          </div>
          <button type="button" className="text-[11px] font-semibold text-ink-soft hover:text-ink">
            Change
          </button>
        </div>
      </div>
    </Card>
  );
}
