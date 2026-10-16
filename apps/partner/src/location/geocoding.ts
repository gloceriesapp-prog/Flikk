// GPS comes from expo-location. Address labels use the backend Google
// Geocoding proxy first, with the device-native geocoder as a fallback.
// Provider REST credentials remain on the backend, never in this app.
//
// This used to just re-export packages/shared/src/location/geocoding.ts,
// which is an older, plainer duplicate — no post-permission-grant wait, no
// Google-proxy reverse geocode. apps/customer's own app-local copy of this
// file picked up real fixes the shared one never got; this is now a real,
// local copy of THAT version (per an explicit ask to reuse the same
// location logic across both apps), not the shared shim. Left as its own
// file rather than editing the shared package, since apps/rider still
// depends on that shared version and hasn't been tested against these
// changes.

import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../api/baseUrl';

// Follow the same resolved backend host as the rest of the app, including
// physical-device LAN resolution during local development.
const API_URL = API_BASE_URL;

// Resolves once the app is really in the foreground ('active'), or after a
// hard cap so a caller can never hang forever on it. The OS permission
// dialog puts the host Activity through a background/recreate cycle (New
// Architecture); a single-shot getCurrentPositionAsync fired while it is
// still settling resolves against a stale native bridge and crashes the
// whole process natively (requestLocationPermission's own note). Gating the
// GPS read on the real 'active' state — not just a fixed delay — is what
// actually waits out that recreation.
function waitUntilActive(timeoutMs = 3000): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      resolve();
    }, timeoutMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        sub.remove();
        resolve();
      }
    });
  });
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super('Location permission was denied.');
  }
}

// Current foreground permission WITHOUT prompting — lets a screen decide
// whether to show the explanatory "allow live location" step + request, or go
// straight to the map because it's already granted.
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestLocationPermission(): Promise<boolean> {  const { status } = await Location.requestForegroundPermissionsAsync();
  // Real crash this works around, not a defensive-programming guess: the
  // OS permission dialog tears down and recreates the host Activity: on
  // React Native's New Architecture, a getCurrentPositionAsync call fired
  // immediately after this resolves races that recreation and resolves
  // its promise against a now-stale native bridge reference — a native
  // NullPointerException (expo.modules.location.LocationHelpers.
  // requestSingleLocation -> PromiseImpl.resolve), unrecoverable by any
  // JS try/catch since the whole process crashes below the JS layer.
  // The real structural fix is requesting permission on a dedicated step
  // BEFORE the map opens (StoreLocationScreen / useChangeStoreLocation),
  // so this resolves while that activity is still fully alive; this wait
  // is belt-and-suspenders for the single-screen case. Gate on the app
  // actually being 'active' again (not just a fixed delay — that only
  // ever raced the recreation) plus a short settle past it.
  if (status === 'granted') {
    await waitUntilActive();
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return status === 'granted';
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  // Wait out any just-dismissed permission dialog's activity recreation
  // before touching the native location module at all (waitUntilActive's
  // own note on the native crash this prevents).
  await waitUntilActive();
  // Last-known first: returns an already-cached OS fix instantly with no
  // fresh single-shot read against a possibly-still-settling native bridge,
  // which is both faster and the safer call right after a permission grant.
  // Only fall through to a live High-accuracy read when the OS has no cached
  // fix at all.
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  } catch {
    // No cached fix / module not ready — fall through to a live read.
  }
  // High, not Balanced — this fix becomes the map's starting pin position
  // and, once confirmed, the store's actual pickup point. A rider follows
  // this exact point, so it's worth the extra second+battery over a
  // coarser fix.
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export interface ReverseGeocodeResult {
  addressLabel: string;
  city: string;
  shortName: string;
}

// Coordinates -> human-readable label. Tries the real Google-backed
// backend proxy first; falls back to the on-device geocoder on any
// failure (network, timeout, key not configured server-side) — this must
// never throw.
export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodeResult> {
  const fromGoogle = await reverseGeocodeViaGoogle(coords);
  if (fromGoogle) return fromGoogle;

  const results = await Location.reverseGeocodeAsync(coords).catch(() => []);
  const first = results[0];
  if (!first) return { addressLabel: 'Selected location', city: '', shortName: 'Selected location' };

  // Android's own system geocoder can hand back a bare Plus Code as `name`
  // for a rural point with nothing closer-by named — guard against that
  // unhelpful headline the same way backend/src/routes/location.ts's own
  // Google-proxy route already does for its path.
  const isPlusCode = first.name ? /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(first.name) : false;
  const namedTitle = isPlusCode ? null : first.name;
  const parts = [namedTitle, first.street, first.district, first.city].filter(Boolean);
  const addressLabel = parts.length > 0 ? parts.join(', ') : 'Selected location';
  const city = first.city ?? first.district ?? first.subregion ?? '';
  const shortName = namedTitle ?? first.street ?? first.district ?? city ?? addressLabel;
  return { addressLabel, city, shortName };
}

async function reverseGeocodeViaGoogle(coords: Coordinates): Promise<ReverseGeocodeResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_URL}/location/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { addressLabel: string | null; shortName?: string; city?: string };
    if (!data.addressLabel) return null;
    return { addressLabel: data.addressLabel, city: data.city ?? '', shortName: data.shortName ?? data.addressLabel };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Free-text address -> coordinates, for the manual-search fallback. Never
// throws — a geocoder failure degrades to "no match" (null), not a crash.
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  const results = await Location.geocodeAsync(query).catch(() => []);
  const first = results[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}

// Coordinates -> just the city/district name, e.g. "Udupi" — kept for
// LocationPinScreen.tsx's own callers (this app's map-pin flow predates
// customer's own richer reverseGeocode above and still uses this narrower
// shape in a couple of places; not worth rewriting those call sites just
// to remove this). Never throws.
export async function reverseGeocodeDistrict(coords: Coordinates): Promise<string | null> {
  const fromGoogle = await reverseGeocodeViaGoogle(coords);
  if (fromGoogle?.city) return fromGoogle.city;
  const results = await Location.reverseGeocodeAsync(coords).catch(() => []);
  const first = results[0];
  if (!first) return null;
  return first.city ?? first.subregion ?? first.district ?? first.region ?? null;
}

// Fuller "building/street, district" label for the map-pin confirm
// screen — same reasoning as reverseGeocodeDistrict above. Never throws.
export async function reverseGeocodeAddress(coords: Coordinates): Promise<string | null> {
  // Use the server-only Geocoding credential for pin labels. SDK map keys
  // authorize tiles only; fall back to the device if the proxy is unavailable.
  const fromGoogle = await reverseGeocodeViaGoogle(coords);
  if (fromGoogle) return fromGoogle.addressLabel;

  const results = await Location.reverseGeocodeAsync(coords).catch(() => []);
  const first = results[0];
  if (!first) return null;
  const landmark = first.name ?? first.street;
  const area = first.district ?? first.subregion ?? first.region ?? first.city;
  if (landmark && area && landmark !== area) return `${landmark}, ${area}`;
  return landmark ?? area ?? null;
}

export interface PlaceSuggestion {
  label: string;
  coordinates: Coordinates;
}

// Free-text search for a location search bar, via backend's Mappls
// Autosuggest proxy — real India-aware place suggestions. Mappls's free
// tier returns labels only, never coordinates, so each label is resolved
// via the free on-device geocoder. Falls back to querying the on-device
// geocoder with the raw typed text if the backend proxy itself is
// unreachable — search must never go silently blank.
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const labels = await fetchSuggestedLabels(trimmed);
  return resolveLabelsToPlaces(labels.length > 0 ? labels : [trimmed]);
}

async function fetchSuggestedLabels(query: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/location/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { labels?: string[] };
    return data.labels ?? [];
  } catch {
    return [];
  }
}

async function resolveLabelsToPlaces(labels: string[]): Promise<PlaceSuggestion[]> {
  try {
    const resolved = await Promise.all(
      labels.slice(0, 6).map(async (label): Promise<PlaceSuggestion | null> => {
        try {
          const matches = await Location.geocodeAsync(label);
          const first = matches[0];
          if (!first) return null;
          return { label, coordinates: { latitude: first.latitude, longitude: first.longitude } };
        } catch {
          return null;
        }
      })
    );
    return resolved.filter((place): place is PlaceSuggestion => place !== null);
  } catch {
    return [];
  }
}

export interface NearbyPlace {
  name: string;
}

// Real nearby landmarks around a settled pin — backend/src/routes/
// location.ts's own /nearby proxy. Never throws.
export async function fetchNearbyPlaces(coords: Coordinates): Promise<NearbyPlace[]> {
  try {
    const res = await fetch(`${API_URL}/location/nearby?lat=${coords.latitude}&lng=${coords.longitude}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { places?: { name: string }[] };
    return (data.places ?? []).map((p) => ({ name: p.name }));
  } catch {
    return [];
  }
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

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
