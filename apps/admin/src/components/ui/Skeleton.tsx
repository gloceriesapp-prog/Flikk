// Shimmer placeholder block — a neutral pulsing rectangle used to sketch a
// page's shape while its data loads, so navigation shows an instant layout
// instead of a blank area or a lone centered spinner. Pure presentational,
// no data — safe to render anywhere.

import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-ink/[0.06]', className)} />;
}
