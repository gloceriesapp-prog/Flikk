import type { ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { CardLabel, CornerLink, FOCUS_RING } from './parts';

// One of the three order-pipeline counts across the top of Home. `action`
// turns the card into the call to act (the "New orders" card when orders are
// waiting): a solid accent Review link replaces the quiet sub-stat's spot.
export function KpiCard({
  icon,
  label,
  value,
  sub,
  action,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: ReactNode;
  action?: { href: string; label: string };
  highlight?: boolean;
}) {
  return (
    <Card className={clsx('flex flex-col gap-2 p-4 sm:gap-4 sm:p-5', highlight && 'ring-1 ring-accent/25')}>
      <div className="flex items-center justify-between gap-3">
        <CardLabel icon={icon}>
          {label}
        </CardLabel>
        <CornerLink href="/orders" label={`Open orders: ${label.toLowerCase()}`} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <p className={clsx('tnum text-[36px] leading-none sm:text-[44px] font-semibold tracking-tight', highlight ? 'text-accent' : 'text-ink')}>
            {value}
          </p>
          <p className="truncate text-sm text-slate-500">{sub}</p>
        </div>
        {action && (
          <Link
            href={action.href}
            className={clsx(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong',
              FOCUS_RING,
            )}
          >
            {action.label}
            <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    </Card>
  );
}
