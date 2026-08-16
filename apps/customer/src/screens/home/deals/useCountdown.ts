// Ticks down to a fixed target Date, formatted as HH:MM:SS. Pass a stable
// Date reference (e.g. from useRef) — a new Date object on every render would
// tear down and rebuild the interval every second for no reason.

import { useEffect, useState } from 'react';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function useCountdown(target: Date) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(msLeft / 1000);
  return {
    hours: pad(Math.floor(totalSeconds / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}
