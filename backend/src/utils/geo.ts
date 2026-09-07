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
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
