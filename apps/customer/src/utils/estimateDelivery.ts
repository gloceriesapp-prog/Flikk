// Real ETA math, not a fabricated countdown — CLAUDE.md's own "status-only
// tracking, no live GPS/ETA math" rule is about not simulating a moving
// rider/live map; a static estimate computed once from real inputs
// (order.placed_at, the store's own avg_prep_minutes) is exactly what that
// same rule already assumes exists ("avg_prep_minutes... shown to a
// customer as an ETA input", stores.ts's own note). Used by both
// TrackOrderScreen and ReceiptScreen so the two screens can't quote two
// different delivery estimates for the same order.

// Single-zone, hyperlocal (CLAUDE.md) — Kaup/outer Udupi is small enough
// that a flat rider-transit buffer on top of prep time is a reasonable
// estimate without needing real distance/routing math, which is explicitly
// out of scope (no live GPS).
const DELIVERY_TRANSIT_BUFFER_MINUTES = 20;

// A store that hasn't set avg_prep_minutes (or the lookup failed — see
// backend's own note on POST /orders) still needs a plausible estimate
// rather than showing nothing.
const DEFAULT_PREP_MINUTES = 15;

export function estimateDeliveryTime(placedAt: string, avgPrepMinutes: number | null): Date {
  const prepMinutes = avgPrepMinutes ?? DEFAULT_PREP_MINUTES;
  return new Date(new Date(placedAt).getTime() + (prepMinutes + DELIVERY_TRANSIT_BUFFER_MINUTES) * 60_000);
}

export function formatEta(eta: Date): string {
  const now = new Date();
  const time = eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return eta.toDateString() === now.toDateString() ? `Today, ${time}` : `${eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

// "Arriving in X min" for OrderRow.tsx's own compact list row — same real
// eta Date as formatEta above, just phrased as a countdown instead of a
// clock time. Floored at 1 (never "in 0 min" or a negative number) since
// this is a coarse single-zone estimate (DELIVERY_TRANSIT_BUFFER_MINUTES's
// own note), not a live countdown that should ever hit exactly zero.
export function formatEtaMinutesRemaining(eta: Date): string {
  const minutesRemaining = Math.max(1, Math.round((eta.getTime() - Date.now()) / 60_000));
  return `Arriving in ${minutesRemaining} min`;
}
