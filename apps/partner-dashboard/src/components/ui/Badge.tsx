import type { ReactNode } from 'react';
import clsx from 'clsx';

// One badge, four tones. Replaces the ad-hoc `rounded-full px-3 py-1 bg-*-50
// text-*-600` scattered across every page so a "paid" pill looks identical
// on Overview, Orders and Payouts.
type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  accent: 'bg-neutral-900 text-white',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
