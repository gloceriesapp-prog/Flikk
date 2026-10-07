// Live remaining-ms-until-deadline, re-computed against real system time
// (Date.now()), so there is no clock drift across re-renders or reloads.
// The clock lives in state and ticks from an interval — reading Date.now()
// during render would make the component impure.

import { useEffect, useState } from 'react';

// Current time, refreshed every `intervalMs` (and right after mount).
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}

export function useCountdownRemaining(deadlineMs: number): number {
  const now = useNow();
  return Math.max(0, deadlineMs - now);
}
