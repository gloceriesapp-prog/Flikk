import clsx from 'clsx';
import { PLACEHOLDER_SYSTEM_STATUS } from '@/lib/mock-data';
import type { SystemHealth } from '@/lib/types';

const HEALTH_STYLES: Record<SystemHealth, { dot: string; text: string }> = {
  operational: { dot: 'bg-success', text: 'text-success' },
  degraded: { dot: 'bg-amber-500', text: 'text-amber-600' },
  down: { dot: 'bg-danger', text: 'text-danger' },
};

// Overview's header used to end in a static Export CSV / Add store button
// pair — both actions already live inline where they're actually used
// (Revenue's own export, Stores' own add flow). "Is the product actually
// live right now" is the more useful glance-and-go signal for a founder
// to see the moment they open this screen.
export function SystemStatusBadge() {
  const { health, message, lastUpdatedAt } = PLACEHOLDER_SYSTEM_STATUS;
  const style = HEALTH_STYLES[health];

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5">
      <span className="relative flex h-2.5 w-2.5">
        {health === 'operational' && (
          <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', style.dot)} />
        )}
        <span className={clsx('relative inline-flex h-2.5 w-2.5 rounded-full', style.dot)} />
      </span>
      <div className="leading-tight">
        <p className={clsx('text-sm font-medium', style.text)}>{message}</p>
        <p className="text-xs text-muted">Updated {lastUpdatedAt}</p>
      </div>
    </div>
  );
}
