// Live remaining-ms-until-deadline, re-computed against real system time (Date.now()).
// Guarantees zero clock drift across component re-renders or app reloads.

import { useEffect, useState } from 'react';

export function useCountdownRemaining(deadlineMs: number): number {
  const getRemaining = () => Math.max(0, deadlineMs - Date.now());

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    // Sync state immediately when deadlineMs changes
    setRemaining(getRemaining());

    if (deadlineMs <= Date.now()) return;

    const interval = setInterval(() => {
      const nextRemaining = Math.max(0, deadlineMs - Date.now());
      setRemaining(nextRemaining);

      if (nextRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineMs]);

  return remaining;
}