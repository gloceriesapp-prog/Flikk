import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  showMenu?: boolean;
  className?: string;
  children: ReactNode;
}

// One card shell reused across every dashboard widget — every card in the
// reference image shares the same title/subtitle/"..." menu header
// pattern, so it's one component, not repeated markup per widget.
export function Card({ title, subtitle, action, showMenu, className, children }: CardProps) {
  return (
    <div className={clsx('rounded-3xl border border-border  p-5', className)}>
      {(title || action || showMenu) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-medium text-ink">{title}</h3>}
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {action ?? (showMenu && <MoreHorizontal size={18} className="mt-0.5 shrink-0 text-muted" />)}
        </div>
      )}
      {children}
    </div>
  );
}
