import type { Payout } from '@/lib/partnerApi';
import { formatInr, formatDate, statusColor, statusLabel } from '@/lib/format';

const COLUMNS = '1.6fr 1fr 1fr 1fr 1fr 1fr';

export function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-neutral-200 bg-white py-20">
        <p className="text-sm font-medium text-neutral-700">No payouts match this view.</p>
        <p className="text-sm text-neutral-400">Try a different filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div
        className="grid gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase"
        style={{ gridTemplateColumns: COLUMNS }}
      >
        <span>Week</span>
        <span>Gross</span>
        <span>Commission</span>
        <span>Net</span>
        <span>Status</span>
        <span>Paid on</span>
      </div>

      <div>
        {payouts.map((p) => (
          <div
            key={p.id}
            className="grid items-center gap-3 border-b border-neutral-100 px-5 py-[18px] last:border-b-0"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span className="text-[15px] font-medium whitespace-nowrap text-neutral-900">
              {formatDate(p.week_start)} – {formatDate(p.week_end)}
            </span>
            <span className="text-sm whitespace-nowrap text-neutral-600">{formatInr(p.gross_amount)}</span>
            <span className="text-sm whitespace-nowrap text-neutral-400">-{formatInr(p.commission_deducted)}</span>
            <span className="text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(p.net_payout)}</span>
            <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusColor(p.status)}`}>
              {statusLabel(p.status)}
            </span>
            <span className="text-sm whitespace-nowrap text-neutral-400">{p.paid_at ? formatDate(p.paid_at) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
