import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { OrderStatus } from '@/lib/partnerApi';
import { formatDateTime } from '@/lib/format';

interface Step {
  key: OrderStatus;
  label: string;
  at: string | null;
}

// Cancelled is a separate terminal state, not a step on this happy-path
// timeline — the detail page renders a plain cancelled banner instead when
// order.status === 'cancelled', so this component never has to represent it.
export function OrderTimeline({ steps, cancelled }: { steps: Step[]; cancelled: boolean }) {
  if (cancelled) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">This order was cancelled.</div>
    );
  }

  const lastDoneIndex = steps.reduce((acc, step, i) => (step.at ? i : acc), -1);

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const done = step.at !== null;
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-200 bg-white text-neutral-300',
                )}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              {!isLast && <div className={clsx('w-0.5 flex-1', i < lastDoneIndex ? 'bg-emerald-500' : 'bg-neutral-200')} />}
            </div>
            <div className={clsx('pb-6', isLast && 'pb-0')}>
              <p className={clsx('text-sm font-medium', done ? 'text-neutral-900' : 'text-neutral-400')}>{step.label}</p>
              <p className="text-xs text-neutral-400">{step.at ? formatDateTime(step.at) : 'Pending'}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
