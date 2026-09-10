// Real open/close status text, shared by StoreCard.tsx and
// NearestToYouSection.tsx — computed once per render from the store's own
// real open_time/close_time (useAllStores.ts/useNearestStores.ts), not a
// live-ticking countdown (no setInterval here, same "no live countdown"
// call OrderInfoCard.tsx's own note makes for order ETAs) — a store's
// hours don't change second to second, recomputing on every re-render
// (list re-renders happen often enough on their own: scroll, a like
// toggle, a poll elsewhere) is already fresh enough.
//
// "Closing in 1h 30m" / "Opens in 45m" only replace the plain "Closes
// 9:30 PM" / "Opens at 7:00 AM" text once the real gap is inside the
// urgency window below — otherwise the plain clock-time version stays,
// per an explicit ask ("closing in 1hr 30 min... when the closed is
// there for 1 hour").

const CLOSING_SOON_MINUTES = 120; // within 2 hours of close
const OPENING_SOON_MINUTES = 60; // within 1 hour of open

// "9:30 PM" / "7:00 AM" — the exact format admin's Add Store form already
// saves (StoreCard.tsx/NearestToYouSection.tsx already render these
// strings as-is elsewhere), not a 24h format needing its own conversion.
function parseTimeToMinutes(time: string): number | undefined {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// IST explicitly — single-zone product (Kaup/outer Udupi, CLAUDE.md),
// same reasoning OrderInfoCard.tsx's own clockTime pins to Asia/Kolkata
// rather than trusting the device's system timezone.
function nowMinutesIST(): number {
  const parts = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hours, minutes] = parts.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export interface StoreStatusText {
  word: 'Open' | 'Closed';
  // null when there's no real open_time/close_time to say anything more
  // specific than the bare word.
  suffix: string | null;
  // True only for the "closing in .../opens in ..." countdown phrasing —
  // callers use this to give it a distinct (gold, not plain ink) color.
  urgent: boolean;
}

export function getStoreStatusText(isOpen: boolean, openTime?: string, closeTime?: string): StoreStatusText {
  const now = nowMinutesIST();

  if (isOpen) {
    const closeMinutes = closeTime ? parseTimeToMinutes(closeTime) : undefined;
    if (closeMinutes === undefined) return { word: 'Open', suffix: null, urgent: false };

    const remaining = closeMinutes - now;
    if (remaining > 0 && remaining <= CLOSING_SOON_MINUTES) {
      return { word: 'Open', suffix: ` · Closing in ${formatDuration(remaining)}`, urgent: true };
    }
    return { word: 'Open', suffix: ` · Closes ${closeTime}`, urgent: false };
  }

  const openMinutes = openTime ? parseTimeToMinutes(openTime) : undefined;
  if (openMinutes === undefined) return { word: 'Closed', suffix: null, urgent: false };

  // Wraps past midnight — a store closed at 11pm opening at 7am tomorrow
  // has a negative raw difference; +24h corrects it to "8 hours away",
  // not a nonsensical negative countdown.
  let remaining = openMinutes - now;
  if (remaining < 0) remaining += 24 * 60;

  if (remaining > 0 && remaining <= OPENING_SOON_MINUTES) {
    return { word: 'Closed', suffix: ` · Opens in ${formatDuration(remaining)}`, urgent: true };
  }
  return { word: 'Closed', suffix: ` · Opens at ${openTime}`, urgent: false };
}
