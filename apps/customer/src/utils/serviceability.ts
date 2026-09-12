// Single-zone serviceability check (CLAUDE.md: single zone only for v1 —
// "zone exists as a DB concept from day 1, the app only ever surfaces one
// active zone"). No zones table/API exists yet, so ACTIVE_ZONE below is a
// placeholder circular boundary around the launch zone (Kaup/outer Udupi,
// coastal Karnataka) — swap these constants (or replace this whole check
// with a real GET /zones lookup) once that backend exists; nothing that
// calls isLocationServiceable needs to change.

export interface ServiceabilityZone {
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
}

export const ACTIVE_ZONE: ServiceabilityZone = {
  centerLatitude: 13.2167, // Kaup, outer Udupi
  centerLongitude: 74.75,
  radiusKm: 15,
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns true when no coordinates are available yet (e.g. before the user
// has picked a delivery address) — we don't want to show "unavailable"
// before we actually know where they are; LocationSelector/address flow
// handles that empty state separately.
export function isLocationServiceable(
  coords: { latitude: number; longitude: number } | null | undefined,
  zone: ServiceabilityZone = ACTIVE_ZONE,
): boolean {
  if (!coords) return true;
  return distanceKm(coords.latitude, coords.longitude, zone.centerLatitude, zone.centerLongitude) <= zone.radiusKm;
}
