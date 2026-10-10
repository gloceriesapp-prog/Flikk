// Turns the raw stream of GPS fixes into one steady position for the map's
// blue dot and the delivery pin. Raw fixes jump around by 5-50 m even when
// the phone is lying still (GPS vs Wi-Fi/cell fixes, multipath indoors), and
// the map's own native blue dot draws every one of them. A small Kalman
// filter weights each fix by its reported accuracy: a sharp GPS fix moves the
// position a lot, a vague network fix barely moves it, and a fix far outside
// both error circles (a jump) is ignored unless the jumps keep coming, which
// means the person really moved.
import type { Coordinates } from './geocoding';

export interface RawFix extends Coordinates {
  // Reported accuracy radius in metres (68% confidence). Null on some devices.
  accuracy: number | null;
  timestamp: number;
}

export interface FilteredFix extends Coordinates {
  // Estimated accuracy radius of the filtered position, in metres.
  accuracy: number;
  timestamp: number;
  // Consecutive fixes rejected as jumps; reset on every accepted fix.
  rejected: number;
}

// How fast the estimate is allowed to drift between fixes (m²/s). ~1.5 m/s
// walking speed squared: someone walking to their gate is followed, GPS
// noise on a still phone is not.
const PROCESS_NOISE = 2.25;
// Device accuracy is missing or nonsense (0) on some phones; treat as vague.
const UNKNOWN_ACCURACY_M = 50;
const MIN_ACCURACY_M = 3;
// A fix this many combined standard deviations away is a jump, not movement.
const JUMP_SIGMA = 3;
// After this many jumps in a row the person really moved (or the first fix
// was the bad one): restart from the new fix.
const MAX_REJECTED = 3;

const METERS_PER_DEGREE_LAT = 111_320;

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = (b.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
  const dLng = (b.longitude - a.longitude) * METERS_PER_DEGREE_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function accuracyOf(fix: RawFix): number {
  return fix.accuracy && fix.accuracy > 0 ? Math.max(fix.accuracy, MIN_ACCURACY_M) : UNKNOWN_ACCURACY_M;
}

function restart(fix: RawFix): FilteredFix {
  return { latitude: fix.latitude, longitude: fix.longitude, accuracy: accuracyOf(fix), timestamp: fix.timestamp, rejected: 0 };
}

export function filterFix(previous: FilteredFix | null, fix: RawFix): FilteredFix {
  if (!previous) return restart(fix);
  const measurementVariance = accuracyOf(fix) ** 2;
  const elapsedSeconds = Math.max(0, (fix.timestamp - previous.timestamp) / 1000);
  const variance = previous.accuracy ** 2 + elapsedSeconds * PROCESS_NOISE;

  const distance = distanceMeters(previous, fix);
  if (distance > JUMP_SIGMA * Math.sqrt(variance + measurementVariance)) {
    if (previous.rejected + 1 >= MAX_REJECTED) return restart(fix);
    return { ...previous, rejected: previous.rejected + 1 };
  }

  const gain = variance / (variance + measurementVariance);
  return {
    latitude: previous.latitude + gain * (fix.latitude - previous.latitude),
    longitude: previous.longitude + gain * (fix.longitude - previous.longitude),
    accuracy: Math.sqrt((1 - gain) * variance),
    timestamp: fix.timestamp,
    rejected: 0,
  };
}
