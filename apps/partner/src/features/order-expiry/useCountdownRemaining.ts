// Live remaining-ms-until-deadline, re-computed against real system time
// (Date.now()), so there is no clock drift across re-renders or reloads.
//
// #29: one shared 1s clock instead of a per-card setInterval. Every placed
// OrderCard used to run its OWN interval, so N pending cards meant N timers,
// each re-rendering its card every second. This is a single app-wide interval
// that only runs while at least one card is actually subscribed, and a card
// subscribes ONLY while it shows a live countdown (useNow(active)) — a settled
// card passes active=false and never ticks. useSyncExternalStore keeps the
// read tear-safe under React 19 concurrent rendering.

import { useSyncExternalStore } from 'react';

let now = Date.now();
let interval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // First subscriber starts the single shared tick.
  if (!interval) interval = setInterval(emit, 1000);
  now = Date.now(); // fresh value the instant a card (re)subscribes
  return () => {
    listeners.delete(listener);
    // Last subscriber leaving stops the interval — no clock runs when nothing
    // on screen is counting down.
    if (interval && listeners.size === 0) {
      clearInterval(interval);
      interval = null;
    }
  };
}

const noopSubscribe = (): (() => void) => () => {};
const getSnapshot = (): number => now;

// Current time, refreshed every second from the shared clock. `active=false`
// opts a card out entirely (empty subscription → never ticks, never
// re-renders), so only cards showing a live countdown pay the per-second cost.
export function useNow(active = true): number {
  return useSyncExternalStore(active ? subscribe : noopSubscribe, getSnapshot);
}

export function useCountdownRemaining(deadlineMs: number): number {
  const now = useNow();
  return Math.max(0, deadlineMs - now);
}
