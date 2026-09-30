import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  // Optional — only shown when the caller has a real, cheaply-computed
  // comparison for this metric (e.g. today vs yesterday). Metrics with no
  // honest baseline to compare against (a live "right now" count like
  // pending orders) simply omit it rather than showing a fabricated %.
  changePct?: number;
  label: string;
}

// The three ring-icon + big-number cards in the reference's header row
// (Total Shipments / Pending Package / Delivery Shipments) — same shape,
// just Gloceries's own three top-line numbers.
export function StatCard({ icon: Icon, value, changePct, label }: StatCardProps) {
  const isUp = (changePct ?? 0) >= 0;

  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
        <Icon size={18} className="text-ink" />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums text-ink">{value}</span>
          {changePct !== undefined && (
            <span className={clsx('text-xs font-semibold', isUp ? 'text-success' : 'text-danger')}>
              {isUp ? '+' : ''}
              {changePct}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
