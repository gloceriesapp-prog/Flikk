import type { ReactNode } from 'react';
import clsx from 'clsx';

// The one card chrome for the whole dashboard. Hairline border + a barely-
// there lift, nothing louder. Every surface (stat tiles, tables, panels)
// composes this so the app reads as one designed thing, not 13 pages.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('card-shadow rounded-xl border border-hairline bg-white', className)}>{children}</div>
  );
}

// A card that already carries a titled header row + body padding — the
// default container for a labelled section (a table, a chart, a form group).
export function SectionCard({
  title,
  description,
  action,
  bodyClassName,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={clsx('overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-neutral-900">{title}</h2>}
            {description && <p className="mt-0.5 truncate text-xs text-neutral-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={clsx(bodyClassName ?? 'p-5')}>{children}</div>
    </Card>
  );
}
