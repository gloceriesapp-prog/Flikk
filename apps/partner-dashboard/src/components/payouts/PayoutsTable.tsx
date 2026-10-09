import type { Payout } from '@/lib/partnerApi';
import { formatInr, formatDate, statusColor, statusLabel } from '@/lib/format';

const COLUMNS = '1.6fr 1fr 1fr 1fr 1fr 1fr';

export function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 card-shadow rounded-xl border border-hairline bg-white py-20">
        <p className="text-sm font-medium text-neutral-700">No payouts match this view.</p>
        <p className="text-sm text-neutral-400">Try a different filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-white">
      <div className="min-w-[720px]">
        {/* Header */}
        <div
          className="grid items-center border-b border-hairline bg-neutral-50 text-[13px] font-medium text-neutral-500"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span className="border-r border-hairline px-4 py-3">Week</span>
          <span className="border-r border-hairline px-4 py-3">Gross</span>
          <span className="border-r border-hairline px-4 py-3">Commission</span>
          <span className="border-r border-hairline px-4 py-3">Net</span>
          <span className="border-r border-hairline px-4 py-3">Status</span>
          <span className="px-4 py-3">Paid on / Admin note</span>
        </div>

        {/* Rows */}
        {payouts.map((p) => (
          <div
            key={p.id}
            className="grid items-stretch border-b border-hairline transition-colors last:border-b-0 hover:bg-neutral-50/70"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span className="flex items-center border-r border-hairline px-4 py-3.5 text-[15px] font-medium whitespace-nowrap text-neutral-900">
              {formatDate(p.week_start)} – {formatDate(p.week_end)}
            </span>
            <span className="flex items-center border-r border-hairline px-4 py-3.5 text-sm whitespace-nowrap text-neutral-600">{formatInr(p.gross_amount)}</span>
            <span className="flex items-center border-r border-hairline px-4 py-3.5 text-sm whitespace-nowrap text-neutral-400">-{formatInr(p.commission_deducted)}</span>
            <span className="flex items-center border-r border-hairline px-4 py-3.5 text-[15px] font-semibold whitespace-nowrap text-neutral-900">{formatInr(p.net_payout)}</span>
            <span className="flex items-center border-r border-hairline px-4 py-3.5">
              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusColor(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </span>
            <span className="flex items-center px-4 py-3.5 text-sm whitespace-nowrap text-neutral-400"><span>{p.paid_at ? formatDate(p.paid_at) : '—'}{p.payment_note && <span className="mt-1 block whitespace-normal text-neutral-600">{p.payment_note}</span>}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
