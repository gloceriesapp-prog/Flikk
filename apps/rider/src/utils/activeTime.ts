// Pure day-rollover bit shared by the store's goOnline (reset) and goOffline
// (bank) paths: today's banked active-time carries forward only within the
// same UTC day, else it's a previous day's shift and resets to 0. Kept
// standalone so the midnight-reset rule has one runnable check (below)
// without dragging SecureStore/Zustand into a test.

export function carryOverActiveMs(prevMs: number, prevDate: string, today: string): number {
  return prevDate === today ? prevMs : 0;
}

// Runnable self-check: `npx tsx src/utils/activeTime.ts`. Import-safe — the
// guard is false inside the RN bundle, so it only fires when run directly.
export function demo(): void {
  const eq = (a: number, b: number) => {
    if (a !== b) throw new Error(`expected ${b}, got ${a}`);
  };
  // Same day → carried; goOffline then banks + session on top.
  eq(carryOverActiveMs(60_000, '2026-09-23', '2026-09-23'), 60_000);
  eq(carryOverActiveMs(60_000, '2026-09-23', '2026-09-23') + 5_000, 65_000);
  // New day → reset (the midnight refresh), regardless of stored total.
  eq(carryOverActiveMs(9_000_000, '2026-09-22', '2026-09-23'), 0);
  // Never-online-today (empty stored date) → 0.
  eq(carryOverActiveMs(0, '', '2026-09-23'), 0);
  console.log('activeTime self-check ok');
}

// @ts-ignore node-only entrypoint; guard is false in the RN bundle
if (typeof require !== 'undefined' && require.main === module) demo();
