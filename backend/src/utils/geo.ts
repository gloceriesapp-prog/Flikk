// Shared haversine distance — same formula apps/customer/src/location/
// geocoding.ts's own distanceKm already uses client-side, duplicated here
// (not imported across the app/backend boundary, which don't share a
// package) so GET /stores/nearest can rank stores server-side instead of
// shipping every store's raw coordinates to the client to sort itself.
// Keeping the math server-side is what actually lets this get smarter later
// (delivery-radius cutoffs, real routing distance) without an app update —
// the client only ever sees "here's your nearest store," never how that was
// computed.

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

// Whether a store this far from the customer is in delivery reach. Reach is the
// store's own radius (delivery_radius_km) or the global fallback when it has
// none; an explicit ops/testing override can only tighten it, never widen past
// the store's real reach. Pure so GET /stores/nearest and /serviceability share
// one cutoff rule (backend/src/routes/stores.ts).
export function isWithinReach(
  distanceKmValue: number,
  storeRadiusKm: number | null | undefined,
  defaultRadiusKm: number,
  maxOverrideKm: number | null,
): boolean {
  const radius = storeRadiusKm ?? defaultRadiusKm;
  const cutoff = maxOverrideKm == null ? radius : Math.min(radius, maxOverrideKm);
  return distanceKmValue <= cutoff;
}

// Estimated road km: straight-line km x the admin's road factor (migration
// 104's delivery_road_km does the same in SQL, so checkout, discovery and the
// database guard agree on every distance).
export function roadKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }, roadFactor: number): number {
  return distanceKm(a, b) * roadFactor;
}
