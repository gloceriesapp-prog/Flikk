'use client';

import clsx from 'clsx';

export interface TrackerItem {
  color?: string;
  tooltip: string;
}

/** Each segment describes one observation; no implied percentage or history. */
export function Tracker({ data, className, label = 'Tracker' }: { data: TrackerItem[]; className?: string; label?: string }) {
  return (
    <div role="list" aria-label={label} className={clsx('flex min-w-0 gap-1', className)}>
      {data.map((item, index) => (
        <div key={`${index}-${item.tooltip}`} role="listitem" tabIndex={0} aria-label={item.tooltip}
          className="group relative min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
          <div aria-hidden data-tracker-segment className={clsx('h-6 rounded-sm transition-opacity group-hover:opacity-75', item.color ?? 'bg-gray-200')} />
          <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-52 -translate-x-1/2 rounded-lg bg-gray-950 px-3 py-2 text-xs leading-5 text-white shadow-sm group-hover:block group-focus-visible:block">
            {item.tooltip}
          </span>
        </div>
      ))}
    </div>
  );
}
