import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// One clock updates precisely when the next visible rounded-up minute
// changes. Expired orders and orders still packing never keep it running.
export function usePurchaseClock(deadlines: readonly number[]): number {
  const [now, setNow] = useState(Date.now);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const refresh = () => {
      stop();
      if (AppState.currentState !== 'active') return;
      const timestamp = Date.now();
      setNow(timestamp);
      let nextDelay = Infinity;
      for (const deadline of deadlines) {
        const remainingMs = deadline - timestamp;
        if (!Number.isFinite(remainingMs) || remainingMs <= 0) continue;
        const minutes = Math.ceil(remainingMs / 60_000);
        nextDelay = Math.min(nextDelay, remainingMs - (minutes - 1) * 60_000);
      }
      if (Number.isFinite(nextDelay)) {
        timer = setTimeout(refresh, Math.max(1, nextDelay));
      }
    };

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
      else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [deadlines, isFocused]);

  return now;
}
