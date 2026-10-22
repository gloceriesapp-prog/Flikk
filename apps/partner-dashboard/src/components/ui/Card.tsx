import type { ReactNode } from 'react';
import clsx from 'clsx';

// The one card chrome for the whole dashboard: white and rounded
// on the grey canvas. Every surface (stat tiles,
// tables, panels) composes this so the app reads as one designed thing.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('rounded-[20px] bg-white', className)}>{children}</div>
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
        <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={clsx(bodyClassName ?? 'px-5 pb-5')}>{children}</div>
    </Card>
  );
}
