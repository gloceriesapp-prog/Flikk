import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/format';

export interface TimelineStep {
  key: string;
  label: string;
  at: string | null;
  completed?: boolean;
}

// Vertical status history. Reached steps are solid accent with their real
// timestamp; the next step to happen is ringed; later ones sit muted.
// Cancelled is a terminal state with no timestamp column in the schema, so a
// cancelled order shows only the steps it actually reached, then a red
// "Cancelled" end cap — never invented times for steps that never happened.
export function OrderTimeline({ steps, cancelled, hint }: { steps: TimelineStep[]; cancelled: boolean; hint?: string }) {
  const shown: (TimelineStep & { tone: 'done' | 'next' | 'todo' | 'cancelled' })[] = [];
  let nextMarked = false;
  for (const step of steps) {
    if (step.at || step.completed) shown.push({ ...step, tone: 'done' });
    else if (cancelled) continue;
    else if (!nextMarked) {
      shown.push({ ...step, tone: 'next' });
      nextMarked = true;
    } else shown.push({ ...step, tone: 'todo' });
  }
  if (cancelled) shown.push({ key: 'cancelled', label: 'Cancelled', at: null, tone: 'cancelled' });

  return (
    <ol className="flex flex-col">
      {shown.map((step, i) => {
        const isLast = i === shown.length - 1;
        const nextDone = shown[i + 1]?.tone === 'done' || shown[i + 1]?.tone === 'cancelled';
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  step.tone === 'done' && 'bg-green-600 text-white',
                  step.tone === 'next' && 'bg-white ring-2 ring-green-600/60',
                  step.tone === 'todo' && 'bg-white ring-1 ring-slate-200',
                  step.tone === 'cancelled' && 'bg-red-500 text-white',
                )}
              >
                {step.tone === 'done' && <Check size={13} strokeWidth={3} aria-hidden />}
                {step.tone === 'cancelled' && <X size={13} strokeWidth={3} aria-hidden />}
                {step.tone === 'next' && <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" aria-hidden />}
              </span>
              {!isLast && (
                <span className={clsx('my-1 w-0.5 flex-1 rounded-full', nextDone ? 'bg-green-600/70' : 'bg-slate-200')} aria-hidden />
              )}
            </div>
            <div className={clsx('min-w-0 flex-1', !isLast && 'pb-5')}>
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    step.tone === 'done' && 'text-ink',
                    step.tone === 'next' && 'text-ink',
                    step.tone === 'todo' && 'text-slate-400',
                    step.tone === 'cancelled' && 'text-red-700',
                  )}
                >
                  {step.label}
                </p>
                <p className="tnum shrink-0 text-xs text-slate-500">
                  {step.at ? formatDateTime(step.at) : step.tone === 'next' ? 'Up next' : step.tone === 'todo' ? '—' : step.tone === 'done' ? 'Completed' : ''}
                </p>
              </div>
              {step.tone === 'next' && hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
              {step.tone === 'cancelled' && (
                <p className="mt-0.5 text-xs text-slate-500">Any captured payment is refunded to the customer.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
