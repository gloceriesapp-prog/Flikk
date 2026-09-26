import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

// Metric cell. The number is the hero (text-3xl, tabular); the label + a
// faint mark sit above it; the change reads as "vs last month [pill]" on a
// quiet bottom line — soft green pill for good, soft red for bad.
export function StatTile({
  label,
  value,
  icon: Icon,
  deltaPercent,
  sublabel,
  invertTone = false,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  deltaPercent?: number;
  sublabel?: string;
  invertTone?: boolean;
}) {
  const up = (deltaPercent ?? 0) >= 0;
  const good = invertTone ? !up : up;
  const showDelta = deltaPercent !== undefined;
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center gap-1.5">
        <p className="text-base font-medium text-black tracking-tight">{label}</p>
        {Icon && <Icon size={13} className="text-neutral-600 font-semibold" />}
      </div>
      <p className="tnum text-3xl font-bold leading-none tracking-tight text-neutral-900">{value}</p>
      {(showDelta || sublabel) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {showDelta && (
            <>
              <span className="text-neutral-600 font-medium tracking-tight">vs last month</span>
              <span
                className={clsx(
                  'tnum inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
                  good ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                )}
              >
                {up ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(1).replace(/\.0$/, '')}%
              </span>
            </>
          )}
          {sublabel && <span className="text-neutral-400 tracking-tight">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
