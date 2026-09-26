import type { ReactNode } from 'react';

// Every page opens with the same header block: a tight title (not the old
// text-3xl — dense dashboards keep chrome small so data dominates), an
// optional one-line subtitle, and a right-aligned action slot.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-3xl font-semibold tracking-tight text-black">{title}</span>
        {subtitle && <p className="mt-1 text-sm text-neutral-600 font-medium tracking-tight">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
