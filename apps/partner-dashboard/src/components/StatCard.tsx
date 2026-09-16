import { ArrowRight, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Trend {
  percent: number;
  label: string;
}

interface Status {
  text: string;
  tone: 'positive' | 'negative';
}

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: Trend;
  status?: Status;
}

// Mirrors the "Account Balance / Total Expenses / Total Savings" reference:
// icon badge + label + corner arrow on one row, the big value on its own
// row below, then a trend pill (or a plain status line for cards like
// Stock that don't have a meaningful %) on its own row below that.
export function StatCard({ label, value, hint, icon: Icon, iconClassName = 'bg-neutral-100 text-neutral-600', trend, status }: Props) {
  return (
    <div className="flex h-[160px] w-full flex-col rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
            <Icon size={15} />
          </div>
          <p className="truncate text-[16px] font-medium text-neutral-800">{label}</p>
        </div>
        <ArrowRight size={15} className="-rotate-[40deg] shrink-0 text-neutral-300" />
      </div>

      <p className="mt-4 text-[33px] leading-none font-semibold tracking-tight text-black">{value}</p>

      {trend ? (
        <div className="mt-2.5 flex items-center gap-2">
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold',
              trend.percent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
            )}
          >
            {trend.percent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend.percent).toFixed(1)}%
          </span>
          <span className="text-[13px] text-neutral-400">{trend.label}</span>
        </div>
      ) : status ? (
        <span
          className={clsx(
            'mt-2.5 inline-flex items-center rounded-full px-2 py-1 text-[13px] font-semibold',
            status.tone === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
          )}
        >
          {status.text}
        </span>
      ) : (
        hint && <p className="mt-2.5 text-[13px] text-neutral-400">{hint}</p>
      )}
    </div>
  );
}
