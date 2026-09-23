// Running "active time today" for the home earnings card: the banked total
// (past sessions today, frozen at each goOffline) plus the live current
// session while online. Offline → just the banked total, held steady until
// midnight resets it (store's goOnline/goOffline own that reset). Ticks via
// useElapsedMs, so it advances minute-by-minute while online and sits still
// while offline.

import { useRiderOrdersStore } from '../store/useRiderOrdersStore';
import { useElapsedMs } from './useElapsedMs';

export function useActiveMsToday(): number {
  const activeMsToday = useRiderOrdersStore((s) => s.activeMsToday);
  const onlineSince = useRiderOrdersStore((s) => s.onlineSince);
  const sessionMs = useElapsedMs(onlineSince); // 0 when offline
  return activeMsToday + sessionMs;
}
