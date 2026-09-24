// Real road-following route between two points, via Google's classic
// Directions REST API — the same server-side-key pattern reverseGeocode.ts
// already uses for Geocoding (maps.googleapis.com/maps/api/..., IP-restricted
// GOOGLE_GEOCODING_API_KEY). The rider app's own GOOGLE_MAPS_API_KEY is the
// Android-app-restricted Maps *SDK* key (renders tiles), NOT usable for a REST
// Directions call — so this stays backend-side, proxied to the app.
//
// The Directions API product must be enabled on the same Google Cloud key.
// Degrades to null (never throws) when the key is unset or Google fails — the
// caller (rider map) then just draws the straight great-circle line it always
// had, so a missing key / quota blip is a cosmetic downgrade, never a crash.
import { env } from '../config/env.js';

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface DirectionsResponse {
  status: string;
  routes?: {
    overview_polyline?: { points?: string };
    // One leg per origin→destination with no waypoints; summed defensively
    // below in case Google ever splits it.
    legs?: { duration?: { value?: number }; distance?: { value?: number } }[];
  }[];
}

// A routed line plus the real driving time/length Google computed for it —
// durationSec/distanceM are null when Google omits legs (shouldn't happen for
// a resolvable driving route, but the caller must not assume they're present).
export interface RouteResult {
  points: LatLng[];
  durationSec: number | null;
  distanceM: number | null;
}

// Google's Encoded Polyline Algorithm Format decode — the one piece of real
// logic here, hence the self-check in routeDirections.test.ts. Standard
// signed-varint + delta scheme; 1e5 fixed-point degrees.
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export async function fetchRoute(origin: LatLng, dest: LatLng): Promise<RouteResult | null> {
  if (!env.googleGeocodingApiKey) return null;
  if (![origin.latitude, origin.longitude, dest.latitude, dest.longitude].every(Number.isFinite)) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`);
    url.searchParams.set('destination', `${dest.latitude},${dest.longitude}`);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('key', env.googleGeocodingApiKey);

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as DirectionsResponse;
    const route = data.status === 'OK' ? data.routes?.[0] : undefined;
    const encoded = route?.overview_polyline?.points;
    if (!encoded) return null;

    const points = decodePolyline(encoded);
    if (points.length === 0) return null;

    const legs = route?.legs ?? [];
    // `|| null`: a 0 sum means legs were absent/empty, not a real 0-second
    // trip — surface it as "no ETA" so the caller uses its own fallback.
    const durationSec = legs.reduce((sum, l) => sum + (l.duration?.value ?? 0), 0) || null;
    const distanceM = legs.reduce((sum, l) => sum + (l.distance?.value ?? 0), 0) || null;
    return { points, durationSec, distanceM };
  } catch {
    return null;
  }
}
