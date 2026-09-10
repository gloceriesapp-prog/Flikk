// Straight-line (haversine) distance between two real lat/lng points —
// used for the distance shown on order cards/detail (api/orders.ts's own
// mapper). Real coordinates in, but this is a straight line, not a routed
// distance — no Directions-API integration exists yet (same "ponytail"
// note DeliveryMapView.tsx/OrderDetailScreen.tsx already carry on ETA).
// Close enough for "roughly how far," not meant to match what a map app
// would show turn-by-turn.

interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const d = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  return Number(d.toFixed(1));
}
