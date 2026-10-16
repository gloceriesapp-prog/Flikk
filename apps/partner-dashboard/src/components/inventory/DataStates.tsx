import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';

// Loading / empty / error building blocks shared by the Inventory, Payouts,
// Analytics and Reviews pages, so all four wait, fail and sit empty the same
// way: a pulsing skeleton (never "Loading…"), an icon + one line + an
// action, and an error with a Retry.

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-100', className)} />;
}

// A metric strip placeholder matching MetricGrid/MetricCard's footprint.
export function MetricGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-[20px] bg-white p-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// Table-ish rows: a leading tile + a few bars, repeated.
export function RowsSkeleton({ rows = 6, leading = true }: { rows?: number; leading?: boolean }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          {leading && <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-3.5 w-20 sm:block" />
          <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Icon size={22} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Couldn’t load this page',
  description = 'Check your connection and try again.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <TriangleAlert size={22} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className={clsx(BUTTON.secondary, 'mt-1')}>
          <RotateCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}

// One set of button / chip classes for the four pages: primary is solid brand
// blue (never black), secondary is white with a slate-200 border, chips are
// pills with an accent-soft active state.
export const BUTTON = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700',
} as const;

export function chipClass(active: boolean) {
  return clsx(
    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
    active ? 'border border-transparent bg-accent-soft text-accent' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  );
}

export function chipCountClass(active: boolean) {
  return clsx('tnum text-xs', active ? 'text-accent/70' : 'text-slate-400');
}
