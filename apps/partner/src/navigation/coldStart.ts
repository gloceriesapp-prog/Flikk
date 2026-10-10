// Pure cold-start gate — extracted from RootNavigator so it's testable
// without mounting the navigator (coldStart.selfcheck.ts). The splash is now
// hydration-gated with a short MIN floor instead of a fixed 2s wall: the real
// stack reveals the instant SecureStore hydration is done, as long as a brief
// brand floor has elapsed so the splash never just flashes. Same shape as the
// fix going into apps/customer.
export interface ColdStartInput {
  hydrated: boolean;
  elapsedMs: number;
  minMs: number;
}

// Done = hydration finished AND the minimum brand floor has elapsed. Both
// gates must clear; whichever resolves last is what reveals the app.
export function computeColdStartDone({ hydrated, elapsedMs, minMs }: ColdStartInput): boolean {
  return hydrated && elapsedMs >= minMs;
}
