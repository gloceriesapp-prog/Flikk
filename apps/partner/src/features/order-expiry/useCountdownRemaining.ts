// Live remaining-ms-until-deadline, re-computed once a second. Generic —
// anything that needs to show a shrinking clock against a fixed deadline
// (right now, just OrderCard's grace-window badge) can use this instead of
// each rolling its own setInterval.

import { useEffect, useState } from 'react';

export function useCountdownRemaining(deadlineMs: number): number {
  // Computed fresh on every mount/deadline change via the initializer, not
  // a synchronous setState in the effect below — the effect's only job is
  // scheduling the recurring tick, not producing the first value too.
  const [remaining, setRemaining] = useState(() => Math.max(0, deadlineMs - Date.now()));

  useEffect(() => {
    if (deadlineMs <= Date.now()) return;

    const interval = setInterval(() => {
      setRemaining(Math.max(0, deadlineMs - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineMs]);

  return remaining;
}
