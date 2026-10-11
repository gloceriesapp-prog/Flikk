// The one "is this rider live online right now" rule, shared by the overview
// "Active riders" stat and the dispatch map. Matches the freshness window the
// dispatch RPCs use (3 min, migration 107): a rider whose status is 'online'
// AND whose last position ping is inside this window is one that can actually
// receive/accept a job — riders.status stays 'online' when the app is killed,
// so the ping freshness is what makes "online" real.

export const FRESH_PING_MS = 3 * 60 * 1000;

export function isFreshPing(lastLocationUpdate: string | null, now: number): boolean {
  if (!lastLocationUpdate) return false;
  const pinged = new Date(lastLocationUpdate).getTime();
  if (Number.isNaN(pinged)) return false;
  return now - pinged <= FRESH_PING_MS;
}
