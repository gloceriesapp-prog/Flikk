import { round2 } from './pricing.js';

// Recompute the base vs extra-stop split of a settled earning. The split is
// NOT persisted (only the combined amount is), so this is derived from the
// current EXTRA_STOP_FEE and the trip's leg count — correct while that
// constant is unchanged. Single orders (stopCount<=1) have no extra-stop part.
export function splitEarning(amount: number, stopCount: number, extraStopFee: number): { base: number; extraStop: number } {
  const stops = Math.max(1, stopCount);
  const extraStop = round2(extraStopFee * (stops - 1));
  const base = round2(amount - extraStop);
  return { base, extraStop };
}
