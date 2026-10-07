// Re-evaluates isOutsideOperatingHours() on a timer so the app actually
// flips open/closed live at the configured closing and opening times while
// it's sitting open — a plain one-time check at render time would only ever
// update the next time something else happens to re-render this component
// (a tab switch, a screen focus), which could leave a stale "closed" banner
// showing well past opening if nobody touched anything else in the meantime.
//
// 30s poll, not a precisely-scheduled single timeout for the exact
// boundary — simpler, and "the banner updates within 30 seconds of the
// real cutover" is more than good enough for a UI state, not a payment
// deadline. The hours come from the cached /delivery-settings query, which
// RootNavigator keeps live (realtime 'settings' events), so an admin change
// re-renders here without waiting for the poll.

import { useEffect, useState } from 'react';
import { useDeliverySettings } from '../api/deliverySettings';
import { formatIstMinute, isOutsideOperatingHours, orderingHoursFrom, reopenDayLabel, type OrderingHours } from './operatingHours';

const POLL_INTERVAL_MS = 30_000;

export function useOrderingHours(): OrderingHours {
  const { data } = useDeliverySettings();
  return orderingHoursFrom(data);
}

function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export function useIsOutsideOperatingHours(): boolean {
  const hours = useOrderingHours();
  return isOutsideOperatingHours(hours, useNow());
}

// e.g. { time: '6:00 AM', day: 'tomorrow' } for the closed labels.
export function useReopenLabel(): { time: string; day: 'today' | 'tomorrow' } {
  const hours = useOrderingHours();
  const now = useNow();
  return { time: formatIstMinute(hours.opensMinute), day: reopenDayLabel(hours, now) };
}
