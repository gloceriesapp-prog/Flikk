import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

// Standalone metric card for the Inventory / Payouts / Analytics / Reviews
// pages: its own white rounded card (sits on the grey canvas in a gap-4
// grid), a soft tinted icon chip + label header, a big confident number, and
// a quiet footer line. Local to these pages on purpose — the shared
// ui/StatTile is a divided-strip cell owned elsewhere; promote this into
// ui/ once every page has moved to separate cards.

export type MetricTone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

const TONES: Record<MetricTone, string> = {
  blue: 'bg-accent-soft text-accent',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

interface Props {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  // Month-over-month change. invertTone flips the colour for metrics where
  // "up" is bad (out of stock, pending approval).
  deltaPercent?: number;
  invertTone?: boolean;
  sublabel?: ReactNode;
}

export function MetricCard({ label, value, icon: Icon, tone = 'blue', deltaPercent, invertTone = false, sublabel }: Props) {
  const showDelta = deltaPercent !== undefined;
  const up = (deltaPercent ?? 0) >= 0;
  const good = invertTone ? !up : up;
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon size={17} strokeWidth={2} />
        </span>
        <p className="truncate text-sm font-medium text-slate-600">{label}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <p className="tnum min-w-0 text-[24px] leading-tight font-semibold tracking-tight break-words text-ink sm:text-[32px] sm:leading-none">{value}</p>
        {showDelta && (
          <span
            className={clsx(
              'tnum inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              good ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
            )}
          >
            {up ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(1).replace(/\.0$/, '')}%
          </span>
        )}
      </div>
      {(sublabel || showDelta) && (
        <p className="-mt-1 truncate text-xs text-slate-400">{sublabel ?? 'vs last month'}</p>
      )}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{children}</div>;
}
