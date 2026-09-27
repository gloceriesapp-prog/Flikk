'use client';

// Overview welcome banner — greeting + live date/time on the left, the
// store online/offline toggle on the right. The clock ticks every second, so
// it lives in its own component: only this subtree re-renders each tick, not
// the whole (charts-heavy) Overview page.

import { useEffect, useState } from 'react';
import { ToggleSwitch } from '@/components/ToggleSwitch';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const TIME_FMT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };

interface Props {
  storeName: string;
  isActive: boolean;
  onToggle: (active: boolean) => void;
  toggling?: boolean;
}

export function WelcomeBanner({ storeName, isActive, onToggle, toggling }: Props) {
  // Start null so server and first client render match (no hydration mismatch
  // from Date()); fill in on mount, then tick every second.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span className=" text-2xl font-semibold text-neutral-900 ">
          {now ? greeting(now.getHours()) : 'Welcome back'}, {storeName}
        </span>
        <p className="mt-0.5 text-sm text-neutral-500 tnum">
          {now ? (
            <>
              {now.toLocaleDateString('en-IN', DATE_FMT)}
              <span className="mx-1.5 text-neutral-300">·</span>
              {now.toLocaleTimeString('en-IN', TIME_FMT)}
            </>
          ) : (
            ' '
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="text-xs font-medium text-neutral-500">
          {isActive ? 'Accepting orders' : 'Paused'}
        </span>
        <ToggleSwitch checked={isActive} onChange={onToggle} disabled={toggling} />
      </div>
    </div>
  );
}
