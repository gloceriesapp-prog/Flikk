import type { IconComponent } from '@/components/icons';
import clsx from 'clsx';

interface StatCardProps {
  icon: IconComponent;
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
    <div className="card flex items-center gap-3.5 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
        <Icon size={18} className="text-brand" />
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-semibold tracking-tight tabular-nums text-ink">{value}</span>
          {changePct !== undefined && (
            <span className={clsx('text-xs font-semibold', isUp ? 'text-success' : 'text-danger')}>
              {isUp ? '+' : ''}
              {changePct}%
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
      </div>
    </div>
  );
}
