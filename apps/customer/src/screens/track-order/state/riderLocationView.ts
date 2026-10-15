// Pure presentation rules for the live rider map (no React, unit-tested in
// __tests__/riderLocationView.test.ts).
import type { MapCoordinates, RiderLocationResponse } from '../../../api/tracking';

export const RIDER_LOCATION_POLL_MS = 10_000;

export interface RiderMapView {
  // null hides the rider marker (no position, pre-pickup ping, or stale).
  rider: MapCoordinates | null;
  destination: MapCoordinates | null;
  // Seconds since the rider's last ping as of `now`; null when unknown.
  ageSeconds: number | null;
  stale: boolean;
  caption: string;
}

export function formatAge(seconds: number): string {
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ago`;
}

// `fetchedAt` is React Query's dataUpdatedAt for the response; the server's
// age_seconds is advanced by local elapsed time since then (a duration, so
// device clock skew cancels out).
export function riderMapView(response: RiderLocationResponse | undefined, fetchedAt: number, now: number): RiderMapView {
  const destination = response?.destination ?? null;
  const location = response?.rider_location ?? null;
  if (!location) {
    return { rider: null, destination, ageSeconds: null, stale: false, caption: 'Waiting for your rider’s live location…' };
  }
  const elapsed = fetchedAt > 0 ? Math.max(0, Math.floor((now - fetchedAt) / 1000)) : 0;
  const ageSeconds = location.age_seconds + elapsed;
  const stale = location.stale || ageSeconds > (response?.stale_after_seconds ?? 180);
  if (stale) {
    return { rider: null, destination, ageSeconds, stale: true, caption: `Live location unavailable · last seen ${formatAge(ageSeconds)}` };
  }
  return { rider: { lat: location.lat, lng: location.lng }, destination, ageSeconds, stale: false, caption: `Location updated ${formatAge(ageSeconds)}` };
}
