// Rider dispatch settings (delivery_settings, migration 113). Bounds match
// that migration's delivery_settings_dispatch_check constraint.

export interface DispatchSettings {
  // Offer rings in km, ascending (stored as metres).
  radiusStepsKm: number[];
  // Seconds each ring is offered before the worker widens to the next.
  stepSeconds: number;
  // Live trips one rider may hold at once; null = no limit.
  maxActiveTripsPerRider: number | null;
}

export const DISPATCH_LIMITS = {
  minRingKm: 0.5,
  maxRingKm: 50,
  maxRings: 6,
  minStepSeconds: 10,
  maxStepSeconds: 600,
  maxTripsPerRider: 20,
} as const;

export function parseDispatchSettings(body: unknown): { ok: true; value: DispatchSettings } | { ok: false; error: string } {
  const input = (body ?? {}) as { radiusStepsKm?: unknown; stepSeconds?: unknown; maxActiveTripsPerRider?: unknown };
  if (!Array.isArray(input.radiusStepsKm) || input.radiusStepsKm.length < 1 || input.radiusStepsKm.length > DISPATCH_LIMITS.maxRings) {
    return { ok: false, error: `Add between 1 and ${DISPATCH_LIMITS.maxRings} dispatch rings.` };
  }
  const rings = input.radiusStepsKm.map(Number);
  if (rings.some((km) => !Number.isFinite(km) || km < DISPATCH_LIMITS.minRingKm || km > DISPATCH_LIMITS.maxRingKm)) {
    return { ok: false, error: `Each ring must be between ${DISPATCH_LIMITS.minRingKm} and ${DISPATCH_LIMITS.maxRingKm} km.` };
  }
  const sorted = [...rings].sort((a, b) => a - b);
  if (new Set(sorted.map((km) => Math.round(km * 1000))).size !== sorted.length) {
    return { ok: false, error: 'Two rings cannot have the same distance.' };
  }
  const stepSeconds = input.stepSeconds;
  if (typeof stepSeconds !== 'number' || !Number.isInteger(stepSeconds) || stepSeconds < DISPATCH_LIMITS.minStepSeconds || stepSeconds > DISPATCH_LIMITS.maxStepSeconds) {
    return { ok: false, error: `Time per ring must be a whole number between ${DISPATCH_LIMITS.minStepSeconds} and ${DISPATCH_LIMITS.maxStepSeconds} seconds.` };
  }
  const max = input.maxActiveTripsPerRider;
  if (max !== null && (typeof max !== 'number' || !Number.isInteger(max) || max < 1 || max > DISPATCH_LIMITS.maxTripsPerRider)) {
    return { ok: false, error: `Max active trips per rider must be empty (no limit) or a whole number from 1 to ${DISPATCH_LIMITS.maxTripsPerRider}.` };
  }
  return { ok: true, value: { radiusStepsKm: sorted, stepSeconds, maxActiveTripsPerRider: max } };
}
