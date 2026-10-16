// Server-side Routes API keeps native tile-rendering credentials separate
// from road routing. The public response remains compatible with rider maps.
import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface LatLng { latitude: number; longitude: number }
export interface RouteResult {
  points: LatLng[];
  durationSec: number | null;
  distanceM: number | null;
}

const MAX_POLYLINE_LENGTH = 200_000;
const MAX_ROUTE_POINTS = 20_000;
function validPoint(point: LatLng): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

// Reject truncated/oversized provider data instead of producing invalid pins
// or looping on malformed varints. Google's encoding uses 1e5 fixed point.
export function decodePolyline(encoded: string): LatLng[] {
  if (encoded.length > MAX_POLYLINE_LENGTH) return [];
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  function delta(): number | null {
    let value = 0;
    let shift = 0;
    while (index < encoded.length && shift <= 30) {
      const chunk = encoded.charCodeAt(index++) - 63;
      if (chunk < 0 || chunk > 63) return null;
      value += (chunk & 31) * 2 ** shift;
      if (chunk < 32) return value % 2 ? -(Math.floor(value / 2) + 1) : value / 2;
      shift += 5;
    }
    return null;
  }
  while (index < encoded.length) {
    const latDelta = delta();
    const lngDelta = delta();
    if (latDelta === null || lngDelta === null) return [];
    latitude += latDelta;
    longitude += lngDelta;
    const point = { latitude: latitude / 1e5, longitude: longitude / 1e5 };
    if (!validPoint(point) || points.length >= MAX_ROUTE_POINTS) return [];
    points.push(point);
  }
  return points;
}

interface RoutesResponse {
  routes?: { polyline?: { encodedPolyline?: unknown }; duration?: unknown; distanceMeters?: unknown }[];
}

export async function fetchRoute(origin: LatLng, dest: LatLng): Promise<RouteResult | null> {
  if (!env.googleRoutesApiKey || !validPoint(origin) || !validPoint(dest)) return null;
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleRoutesApiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: dest } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        computeAlternativeRoutes: false,
        polylineQuality: 'OVERVIEW',
        polylineEncoding: 'ENCODED_POLYLINE',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      logger.warn({ provider: 'google_routes', httpStatus: response.status }, 'Route provider rejected request; check server API restrictions and billing');
      return null;
    }
    const data = await response.json() as RoutesResponse;
    const route = Array.isArray(data.routes) ? data.routes[0] : undefined;
    const encoded = route?.polyline?.encodedPolyline;
    if (typeof encoded !== 'string') return null;
    const points = decodePolyline(encoded);
    if (points.length === 0) return null;
    const duration = typeof route?.duration === 'string' && /^\d+(?:\.\d+)?s$/.test(route.duration)
      ? Number(route.duration.slice(0, -1)) : NaN;
    const distance = route?.distanceMeters;
    return {
      points,
      durationSec: Number.isFinite(duration) && duration >= 0 ? duration : null,
      distanceM: typeof distance === 'number' && Number.isFinite(distance) && distance >= 0 ? distance : null,
    };
  } catch {
    // Never log provider errors/URLs: they can contain credentials or GPS data.
    logger.warn({ provider: 'google_routes' }, 'Route lookup unavailable or timed out');
    return null;
  }
}
