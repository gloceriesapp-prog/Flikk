// Re-evaluates isOutsideOperatingHours() on a timer so the app actually
// flips open/closed live at 10:30 PM and 6:00 AM IST while it's sitting open
// — a plain one-time check at render time would only ever update the next
// time something else happens to re-render this component (a tab switch, a
// screen focus), which could leave a stale "closed" banner showing well
// past 6 AM if nobody touched anything else in the meantime.
//
// 30s poll, not a precisely-scheduled single timeout for the exact
// boundary — simpler, and "the banner updates within 30 seconds of the
// real cutover" is more than good enough for a UI state, not a payment
// deadline.

import { useEffect, useState } from 'react';
import { isOutsideOperatingHours } from './operatingHours';

const POLL_INTERVAL_MS = 30_000;

export function useIsOutsideOperatingHours(): boolean {
  const [isClosed, setIsClosed] = useState(isOutsideOperatingHours);

  useEffect(() => {
    const interval = setInterval(() => setIsClosed(isOutsideOperatingHours()), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return isClosed;
}
