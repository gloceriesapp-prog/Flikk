// The two-phase accept window, split on purpose:
//
// 1. Attention phase (features/incoming-order-alert/'s own
//    AUTO_DECLINE_SECONDS, 60s) — the full-screen alert + sound. Its only
//    job is grabbing attention; it never rejects on its own anymore.
// 2. Grace phase — the remainder of ORDER_ACCEPT_WINDOW_MS after the
//    alert closes. The order sits as a normal, fully-acceptable card in
//    the Orders queue with a live countdown badge (OrderCard.tsx) and no
//    sound/lock-out — a shop owner mid-customer for a few minutes doesn't
//    lose the order just because they didn't look at their phone the
//    instant it buzzed. Three reminder checkpoints inside this phase
//    (REMINDER_CHECKPOINTS_MS) nudge them without a full second interrupt
//    — see useOrderExpiryWatcher.ts/orderReminderNotification.ts.
//
// Only once the *total* window (from the moment the order was placed, not
// from when the alert closed) elapses does useOrderExpiryWatcher.ts
// actually reject it. Same shape Swiggy/Zomato-style partner apps use: a
// short hard interrupt, then a longer soft window with reminders — not
// one blocking screen held open the whole time.

import type { PartnerOrder } from '../../screens/orders/data';

export const ORDER_ACCEPT_WINDOW_MS = 15 * 60 * 1000;

// When to nudge a still-pending order, as elapsed time since it was
// placed — spread across the 15-minute window so "multiple reminders" is
// real, not just a first-and-last pair: a mid-window check-in, a second
// nudge once it's clearly overdue, and a final warning close to the
// cutoff. Each fires once per order (see
// useOrderExpiryWatcher.ts's remindedCheckpointsRef) — the last entry is
// always the "final" stage, everything before it is "first", regardless
// of how many checkpoints this list ends up with.
export const REMINDER_CHECKPOINTS_MS = [5 * 60 * 1000, 10 * 60 * 1000, 13 * 60 * 1000] as const;
export type ReminderStage = 'first' | 'final';

export function getElapsedMs(order: PartnerOrder, now: number = Date.now()): number {
  return now - order.placedAtTimestamp;
}

export function getRemainingAcceptMs(order: PartnerOrder, now: number = Date.now()): number {
  return Math.max(0, ORDER_ACCEPT_WINDOW_MS - getElapsedMs(order, now));
}

export function hasAcceptWindowExpired(order: PartnerOrder, now: number = Date.now()): boolean {
  return getRemainingAcceptMs(order, now) <= 0;
}

// "3:42" — mm:ss, floored to the second. The accept window never reaches
// an hour, so minutes alone (not hh:mm:ss) is enough.
export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
