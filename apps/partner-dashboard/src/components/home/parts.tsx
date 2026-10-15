'use client';

// Small building blocks shared by the Home cards so every card header, corner
// link, thumbnail and skeleton looks the same.

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowUpRight, ChevronDown, type LucideIcon } from 'lucide-react';

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

// A clock that ticks every `intervalMs`, so "Waiting 4 min" moves on its own
// between data polls.
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Icon + label, the reference's small card heading.
export function CardLabel({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2 text-[15px] font-medium text-slate-700', className)}>
      <Icon size={18} strokeWidth={1.8} className="shrink-0 text-accent" aria-hidden />
      <span className="truncate">{children}</span>
    </div>
  );
}

// The round ↗ in a card's corner that opens the full page.
export function CornerLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={clsx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-ink',
        FOCUS_RING,
      )}
    >
      <ArrowUpRight size={17} strokeWidth={1.8} />
    </Link>
  );
}

// "Last 7 days ▾" pill. A native select underneath keeps it keyboard and
// screen-reader friendly without a custom menu.
export function RangePill<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="relative shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={clsx(
          'h-9 cursor-pointer appearance-none rounded-full border border-slate-200 bg-white pr-8 pl-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300',
          FOCUS_RING,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500" aria-hidden />
    </div>
  );
}

const THUMB_TINTS = [
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700',
  'bg-rose-50 text-rose-700',
  'bg-violet-50 text-violet-700',
];

// Product/order photo, or a tinted initial tile when there is no photo (or it
// fails to load). Same name always gets the same tint.
export function Thumb({ src, name, size = 'md' }: { src: string | null; name: string; size?: 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl text-base' : 'h-11 w-11 rounded-xl text-sm';
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className={clsx('shrink-0 border border-slate-100 bg-slate-50 object-cover', box)}
      />
    );
  }
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <div
      aria-hidden
      className={clsx('flex shrink-0 items-center justify-center font-semibold', box, THUMB_TINTS[hash % THUMB_TINTS.length])}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}
