// Pure decision for which presence/assignment loops run, given the app's
// foreground phase and the rider's shift state. Extracted so the battery/data
// rule is unit-testable without React Native (`npx tsx
// src/store/presenceLoops.selfcheck.ts`) and so the store + the AppState
// listener (useAutoOnline) read from ONE source of truth.
//
// THE DEDUPE RULE (one /rider/status writer at a time, never a double PATCH):
//  - Foregrounded + online → the in-app 45s foreground ping is the writer;
//    the OS background-location task is suppressed.
//  - Backgrounded + online → the background-location task is the SOLE writer;
//    the foreground loops are stopped.
// Before this, goOnline started BOTH the foreground ping and the background
// task, so a foregrounded online rider PATCHed /rider/status twice every 45s
// and kept the 12s poll + 45s ping draining with the screen off.

export type AppPhase = 'active' | 'background';

// iOS has a transient 'inactive' (and 'unknown'/'extension'); anything that
// isn't 'active' counts as backgrounded for loop purposes. Typed as string so
// this file stays free of the react-native AppStateStatus import (keeps it
// runnable under plain tsx).
export function normalizeAppState(state: string): AppPhase {
  return state === 'active' ? 'active' : 'background';
}

export interface LoopPlan {
  // The 12s GET /rider/assignments foreground poll (useRiderOrdersStore
  // POLL_INTERVAL_MS). Foreground-only: paused in background regardless of
  // shift state, resumed on foreground.
  assignmentPoll: boolean;
  // The 45s foreground /rider/status ping + nearby-offers refresh
  // (LOCATION_PING_INTERVAL_MS). Runs only while foregrounded AND online.
  presencePing: boolean;
  // The expo background-location task (backgroundLocation.ts) acting as the
  // sole /rider/status writer. On only while backgrounded AND online.
  backgroundWriter: boolean;
}

export function loopPlan(phase: AppPhase, isOnline: boolean): LoopPlan {
  const active = phase === 'active';
  return {
    assignmentPoll: active,
    presencePing: active && isOnline,
    backgroundWriter: isOnline && !active,
  };
}

// Convenience predicate matching the task's naming — the foreground loops
// (assignment poll + presence ping) only make sense foregrounded; presence
// additionally needs the rider online. Both are encoded in loopPlan; this is
// the "are any foreground loops live" summary.
export function shouldRunForegroundLoops(phase: AppPhase, isOnline: boolean): boolean {
  const plan = loopPlan(phase, isOnline);
  return plan.assignmentPoll || plan.presencePing;
}
