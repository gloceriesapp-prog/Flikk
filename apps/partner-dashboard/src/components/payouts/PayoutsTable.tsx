import clsx from 'clsx';
import type { Payout } from '@/lib/partnerApi';
import { formatInr, formatDate, statusColor, statusLabel } from '@/lib/format';

const COLUMNS = 'minmax(0,1.5fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,0.9fr) minmax(0,1.5fr)';

// "5 – 11 Oct 2026" when the week sits inside one month, else the full pair.
export function formatWeek(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${formatDate(endIso)}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${formatDate(endIso)}`;
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`;
}

const DOT: Record<Payout['status'], string> = {
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  paid: 'bg-emerald-500',
  blocked: 'bg-red-500',
  failed: 'bg-red-500',
};

function StatusPill({ status }: { status: Payout['status'] }) {
  return (
    <span className={clsx('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', statusColor(status))}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', DOT[status])} />
      {statusLabel(status)}
    </span>
  );
}

function PaidOn({ payout }: { payout: Payout }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {(payout.paid_at || !payout.payment_note) && (
        <span className={clsx('text-sm whitespace-nowrap', payout.paid_at ? 'text-slate-600' : 'text-slate-300')}>
          {payout.paid_at ? formatDate(payout.paid_at) : '—'}
        </span>
      )}
      {payout.payment_note && (
        <span className="w-fit max-w-full rounded-lg bg-slate-50 px-2 py-1 text-xs leading-snug text-slate-600">{payout.payment_note}</span>
      )}
    </div>
  );
}

// Rows only — the page wraps this in its Card and owns empty/loading/error.
export function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  return (
    <>
      {/* ≥ md: table */}
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[760px]">
          <div
            className="grid items-center border-y border-slate-100 bg-slate-50/70 text-[13px] font-medium text-slate-500"
            style={{ gridTemplateColumns: COLUMNS }}
          >
            <span className="px-5 py-3">Week</span>
            <span className="px-4 py-3 text-right">Gross</span>
            <span className="px-4 py-3 text-right">Commission</span>
            <span className="px-4 py-3 text-right">Net payout</span>
            <span className="px-4 py-3 pl-8">Status</span>
            <span className="px-5 py-3">Paid on / note</span>
          </div>

          <div className="divide-y divide-slate-100">
            {payouts.map((p) => (
              <div key={p.id} className="grid items-center transition-colors hover:bg-slate-50/80" style={{ gridTemplateColumns: COLUMNS }}>
                <span className="px-5 py-4 text-[15px] font-medium whitespace-nowrap text-ink">{formatWeek(p.week_start, p.week_end)}</span>
                <span className="tnum px-4 py-4 text-right text-sm whitespace-nowrap text-slate-600">{formatInr(p.gross_amount)}</span>
                <span className="tnum px-4 py-4 text-right text-sm whitespace-nowrap text-slate-400">−{formatInr(p.commission_deducted)}</span>
                <span className="tnum px-4 py-4 text-right text-[15px] font-semibold whitespace-nowrap text-ink">{formatInr(p.net_payout)}</span>
                <span className="px-4 py-4 pl-8">
                  <StatusPill status={p.status} />
                </span>
                <span className="px-5 py-4">
                  <PaidOn payout={p} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* < md: stacked cards */}
      <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
        {payouts.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{formatWeek(p.week_start, p.week_end)}</p>
              <StatusPill status={p.status} />
            </div>
            <p className="tnum text-xl font-semibold text-ink">{formatInr(p.net_payout)}</p>
            <p className="tnum text-xs text-slate-500">
              Gross {formatInr(p.gross_amount)} · Commission −{formatInr(p.commission_deducted)}
            </p>
            {(p.paid_at || p.payment_note) && (
              <div className="text-xs text-slate-500">
                {p.paid_at && <p>Paid on {formatDate(p.paid_at)}</p>}
                {p.payment_note && <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-slate-600">{p.payment_note}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
