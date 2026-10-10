// Pure gating decision for the cold-start WelcomeScreen (RootNavigator.tsx).
// The WelcomeScreen is shown until BOTH: hydration (SecureStore/AsyncStorage —
// auth + location + cart) has completed AND a small minimum has elapsed, so a
// near-instant hydration doesn't flash the welcome logo for one frame. It is NO
// LONGER a fixed 5s gate — whichever of {hydrated, min elapsed} finishes last
// reveals the real stack, and on a fast device that is ~minMs, not 5000ms.
//
// Pulled out as a pure function specifically so it's unit-testable without a
// renderer — see welcomeGate.selfcheck.ts.

export interface WelcomeGateInput {
  hydrated: boolean;
  elapsedMs: number;
  minMs: number;
}

// WelcomeScreen is visible until ready; ready = hydrated AND past the min floor.
export function computeWelcomeVisible({ hydrated, elapsedMs, minMs }: WelcomeGateInput): boolean {
  return !(hydrated && elapsedMs >= minMs);
}
