// Live "how long since X" — ticks once every 30s (this only ever renders
// as whole minutes, no point re-rendering every second for that). Returns
// 0 when sinceMs is null so callers don't need their own null-branch just
// to format a duration.

import { useEffect, useState } from 'react';

export function useElapsedMs(sinceMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sinceMs === null) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [sinceMs]);

  return sinceMs === null ? 0 : now - sinceMs;
}
