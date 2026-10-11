// ETA shown on the active-order pill.
//
// An order carries an immutable recorded delivery deadline, but a *live* order
// must never show "0 min" (or a negative) while it's still on its way — a
// kirana or rider can run past the original window. So once the recorded
// deadline passes, the displayed countdown rolls forward in fixed windows and
// counts that down, repeating until the order actually leaves an active state:
//   - a normally-long delivery resets to 15 min,
//   - a short one resets to 10 min,
// chosen by the order's own original estimate (see resetWindowMinutes).
//
// This is display-only. It never changes the real recorded ETA or anything
// server-side — it only governs the number on the pill. Pure + nowMs-injected
// so it's deterministic and unit-tested (activeOrderEta.selfcheck.ts).

const LONG_RESET_MINUTES = 15;
const SHORT_RESET_MINUTES = 10;
// An order whose own estimate was at least this long resets to the 15-min
// window; shorter orders reset to 10. Tune this one threshold to taste.
const LONG_ORDER_THRESHOLD_MINUTES = 15;

export function resetWindowMinutes(baseMinutes: number | null | undefined): number {
  return typeof baseMinutes === 'number' && Number.isFinite(baseMinutes) && baseMinutes >= LONG_ORDER_THRESHOLD_MINUTES
    ? LONG_RESET_MINUTES
    : SHORT_RESET_MINUTES;
}

export interface DisplayEtaInput {
  // Recorded delivery deadline as an epoch-ms timestamp, or null when it
  // can't be computed at all.
  deadlineMs: number | null;
  // The order's own estimate in minutes — selects the reset window.
  baseMinutes: number | null;
  nowMs: number;
}

// Whole minutes to display on the pill. ALWAYS >= 1 — never 0 or negative.
// Before the deadline it is the real time remaining; after the deadline it
// loops down through `resetWindowMinutes`, restarting from the full window
// each time it would hit 0.
export function computeDisplayEta({ deadlineMs, baseMinutes, nowMs }: DisplayEtaInput): number {
  const reset = resetWindowMinutes(baseMinutes);
  if (deadlineMs === null || !Number.isFinite(deadlineMs)) return reset;

  const msLeft = deadlineMs - nowMs;
  if (msLeft > 0) return Math.max(1, Math.ceil(msLeft / 60_000));

  // Deadline passed while still active: position inside the current reset
  // window and show the minutes left in it. At the exact boundary this yields
  // the full reset window (the "restart from 15/10") rather than 0.
  const resetMs = reset * 60_000;
  const elapsedIntoLoop = (-msLeft) % resetMs;
  const msLeftInLoop = resetMs - elapsedIntoLoop;
  return Math.max(1, Math.ceil(msLeftInLoop / 60_000));
}
