import type { Coordinates } from './geocoding';

export interface RawFix extends Coordinates {
  accuracy: number | null;
  timestamp: number;
  speed?: number | null;
}

export interface FilteredFix extends Coordinates {
  // Visible uncertainty never promises better accuracy than the provider.
  accuracy: number;
  variance?: number;
  timestamp: number;
  rejected: number;
  // Consecutive outliers must agree before replacing a settled position.
  candidate?: RawFix;
  movementCandidate?: RawFix;
  movingUntil?: number;
}

const PROCESS_NOISE = 2.25;
const UNKNOWN_ACCURACY_M = 50;
const MIN_ACCURACY_M = 3;
const MAX_ACCURACY_M = 100;
const JUMP_SIGMA = 3;
const MAX_REJECTED = 3;
const METERS_PER_DEGREE_LAT = 111_320;

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = (b.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
  const dLng = (b.longitude - a.longitude) * METERS_PER_DEGREE_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function accuracyOf(fix: RawFix): number {
  return fix.accuracy != null && Number.isFinite(fix.accuracy) && fix.accuracy > 0
    ? Math.max(fix.accuracy, MIN_ACCURACY_M) : UNKNOWN_ACCURACY_M;
}

// Native providers may initially replay a cached fix. Never use stale or
// malformed samples as a delivery position; coarse fixes remain manual-only.
export function isUsableLocationFix(fix: RawFix, now = Date.now()): boolean {
  return Number.isFinite(fix.latitude) && Math.abs(fix.latitude) <= 90
    && Number.isFinite(fix.longitude) && Math.abs(fix.longitude) <= 180
    && Number.isFinite(fix.timestamp) && fix.timestamp <= now + 5_000
    && now - fix.timestamp <= 15_000 && accuracyOf(fix) <= MAX_ACCURACY_M;
}

function restart(fix: RawFix): FilteredFix {
  return { latitude: fix.latitude, longitude: fix.longitude, accuracy: accuracyOf(fix), timestamp: fix.timestamp, rejected: 0 };
}

export function filterFix(previous: FilteredFix | null, fix: RawFix): FilteredFix {
  if (!previous) return restart(fix);
  if (fix.timestamp <= previous.timestamp) return previous;
  const measuredAccuracy = accuracyOf(fix);
  // A settled GPS position must not be displaced by a much worse Wi-Fi fix.
  if (measuredAccuracy > Math.max(50, previous.accuracy * 3)) return previous;
  const measurementVariance = measuredAccuracy ** 2;
  const elapsedSeconds = Math.min(30, (fix.timestamp - previous.timestamp) / 1000);
  const variance = (previous.variance ?? previous.accuracy ** 2) + elapsedSeconds * PROCESS_NOISE;
  const distance = distanceMeters(previous, fix);

  if (distance > JUMP_SIGMA * Math.sqrt(variance + measurementVariance)) {
    const agrees = previous.candidate != null
      && fix.timestamp - previous.candidate.timestamp <= 10_000
      && distanceMeters(previous.candidate, fix) <= Math.max(20, measuredAccuracy * 2);
    const rejected = agrees ? previous.rejected + 1 : 1;
    if (rejected >= MAX_REJECTED && measuredAccuracy <= 50) return restart(fix);
    return { ...previous, rejected, candidate: fix };
  }

  // GPS uncertainty is not movement. Keep the displayed position anchored
  // inside that uncertainty, including when accuracy fluctuates between fixes.
  // A substantially better fix must still correct an initially coarse position.
  const improved = measuredAccuracy < previous.accuracy * 0.6;
  const holdRadius = Math.min(12, Math.max(3, Math.min(previous.accuracy, measuredAccuracy) * 0.8));
  const speed = fix.speed != null && Number.isFinite(fix.speed) && fix.speed >= 0 ? fix.speed : null;
  const candidate = previous.movementCandidate;
  const consistentMovement = candidate != null
    && fix.timestamp - candidate.timestamp <= 5_000
    && distance > holdRadius
    && distanceMeters(previous, candidate) > holdRadius
    && distanceMeters(candidate, fix) < Math.min(distance, distanceMeters(previous, candidate));
  const moving = (speed != null && speed >= 0.8)
    || (consistentMovement && (speed == null || distance > holdRadius * 2))
    || (speed == null && (previous.movingUntil ?? 0) > fix.timestamp);
  const stationary = !improved && !moving;
  // Once movement is established, heavy smoothing would leave the dot
  // several seconds behind a walking user. Keep the stronger hold for rest.
  const gain = Math.max(moving ? 0.65 : 0, variance / (variance + measurementVariance));
  return {
    latitude: stationary ? previous.latitude : previous.latitude + gain * (fix.latitude - previous.latitude),
    longitude: stationary ? previous.longitude : previous.longitude + gain * (fix.longitude - previous.longitude),
    accuracy: Math.max(measuredAccuracy, Math.sqrt((1 - gain) * variance)),
    variance: Math.max(MIN_ACCURACY_M ** 2, (1 - gain) * variance),
    timestamp: fix.timestamp,
    rejected: 0,
    movementCandidate: stationary && distance > holdRadius ? fix : undefined,
    movingUntil: moving ? (consistentMovement || speed != null ? fix.timestamp + 5_000 : previous.movingUntil) : undefined,
  };
}
