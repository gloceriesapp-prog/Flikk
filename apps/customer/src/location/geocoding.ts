// Thin wrapper around expo-location's device-native geocoder. Free, no API
// key — the device's own Apple/Google geocoding framework does the work.
// Good enough for "search an address, drop a pin" at MVP scale; not a live
// autocomplete-as-you-type (that needs Google Places, a paid API — see
// specs/00-foundation/environments-and-config.md's cost ceiling before adding it).
//
// reverseGeocode itself now tries the real Google Geocoding API first, via
// backend/src/routes/location.ts's /reverse-geocode proxy (that key is
// server-side only, never shipped here — see that route's own note on
// why). This on-device geocoder is the fallback, not the primary path
// anymore: it's Apple's CLGeocoder on iOS, which is measurably coarse
// outside major Indian metros — a village-level pin in CLAUDE.md's own
// Kaup/outer-Udupi launch zone often resolves no finer than city/state,
// which is the "nearest big place, not my genuine address" gap Google's
// API closes. Still used when the backend call fails or the key isn't
// configured yet — never a hard dependency, degrades to what this file
// already did before.

import * as Location from 'expo-location';
import { apiRequest } from '../api/client';
import { withDeadline } from '../utils/deadline';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class LocationPermissionDeniedError extends Error {
  constructor() {
    super('Location permission was denied.');
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  // Real crash this works around, not a defensive-programming guess: the
  // OS permission dialog tears down and recreates the host Activity: on
  // React Native's New Architecture (enabled in this app,
  // android/gradle.properties), a getCurrentPositionAsync call fired
  // immediately after this resolves races that recreation and resolves
  // its promise against a now-stale native bridge reference — a native
  // NullPointerException (expo.modules.location.LocationHelpers.
  // requestSingleLocation -> PromiseImpl.resolve), unrecoverable by any
  // JS try/catch since the whole process crashes below the JS layer.
  // Every caller of this function goes straight into a
  // getCurrentPositionAsync call once permission is granted (Location-
  // PermissionScreen/LocationSearchScreen), so the wait belongs here
  // once, not duplicated at each call site. 400ms is comfortably past
  // the activity-recreation window on real hardware without being a
  // noticeable pause to the user waiting on a permission prompt.
  if (status === 'granted') await new Promise((resolve) => setTimeout(resolve, 400));
  return status === 'granted';
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  // High, not Balanced — this fix becomes the map's starting pin position
  // and, once confirmed, the actual delivery address. A rider follows this
  // exact point, so it's worth the extra second+battery over a coarser fix.
  const position = await withDeadline(Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  }), 15000);
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export interface ReverseGeocodeResult {
  addressLabel: string;
  // Header/list display only ever wants the city, not the full street
  // address — kept separate from addressLabel rather than parsed back out
  // of it later, since expo-location already hands back city as its own
  // field.
  city: string;
  // The confirm card's bold headline — a real named place (building/POI/
  // neighborhood), not a naive addressLabel.split(',')[0] (backend/src/
  // routes/location.ts's own note on why that hack gave wrong titles).
  // Google's path builds this from address_components' priority chain;
  // the on-device fallback below does the same with what it has.
  shortName: string;
}

// Coordinates -> human-readable label, used to prefill the confirm screen and
// the final saved address line. Tries the real Google-backed backend proxy
// first; falls back to the on-device geocoder on any failure (network,
// timeout, key not configured server-side) — this must never throw, the
// map confirm screen already treats a failed reverse-geocode as "keep the
// previous label," not a hard error.
export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodeResult> {
  const fromGoogle = await reverseGeocodeViaGoogle(coords);
  if (fromGoogle) return fromGoogle;

  const results = await withDeadline(Location.reverseGeocodeAsync(coords), 10000).catch(() => []);
  const first = results[0];
  if (!first) return { addressLabel: 'Selected location', city: '', shortName: 'Selected location' };

  // Android's own system geocoder (what this call resolves to there) can
  // hand back a bare Plus Code as `name` for a rural point with nothing
  // closer-by named — same real-but-unhelpful-headline problem
  // backend/src/routes/location.ts's own Google-proxy route already
  // guards against for ITS path; this is the on-device fallback path,
  // reached whenever the server key isn't configured (as it currently
  // isn't) or that call fails, so it needs the same guard independently.
  const isPlusCode = first.name ? /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(first.name) : false;
  const namedTitle = isPlusCode ? null : first.name;
  const parts = [namedTitle, first.street, first.district, first.city].filter(Boolean);
  const addressLabel = parts.length > 0 ? parts.join(', ') : 'Selected location';
  const city = first.city ?? first.district ?? first.subregion ?? '';
  const shortName = namedTitle ?? first.street ?? first.district ?? city ?? addressLabel;
  return { addressLabel, city, shortName };
}

async function reverseGeocodeViaGoogle(coords: Coordinates): Promise<ReverseGeocodeResult | null> {
  try {
    const data = await apiRequest<{ addressLabel: string | null; shortName?: string; city?: string }>(`/location/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`, { auth: false });
    if (!data.addressLabel) return null;
    return { addressLabel: data.addressLabel, city: data.city ?? '', shortName: data.shortName ?? data.addressLabel };
  } catch {
    return null;
  }
}

// Free-text address -> coordinates, for the manual-search fallback.
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  const results = await withDeadline(Location.geocodeAsync(query), 10000);
  const first = results[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}

// Live place-name suggestions as the user types — backend/src/routes/
// location.ts's /search proxy (Mappls Autosuggest). Text-only, on purpose:
// that route's own header note explains why (Mappls's free tier doesn't
// return coordinates from Autosuggest) — tapping a suggestion here still
// has to go through geocodeAddress above to actually resolve it to a
// pin, same as typing a full address and hitting search. Never throws —
// an empty array degrades to "no suggestions shown," not a crash, same
// convention the backend route's own network-failure branch already uses.
export async function searchPlaces(query: string): Promise<string[]> {
  try {
    if (query.trim().length < 3) return [];
    const data = await apiRequest<{ labels?: string[] }>(`/location/search?q=${encodeURIComponent(query)}`, { auth: false });
    return data.labels ?? [];
  } catch {
    return [];
  }
}

export interface NearbyPlace {
  name: string;
}

// Real nearby landmarks around a settled pin — backend/src/routes/
// location.ts's own /nearby proxy (Google Places Nearby Search). Called
// alongside reverseGeocode once the map stops moving, never on every
// drag frame — same onRegionChangeComplete-only convention that call
// already follows. Never throws; an empty array just means no chip row
// renders, not an error state.
export async function fetchNearbyPlaces(coords: Coordinates): Promise<NearbyPlace[]> {
  try {
    const data = await apiRequest<{ places?: { name: string }[] }>(`/location/nearby?lat=${coords.latitude}&lng=${coords.longitude}`, { auth: false });
    return (data.places ?? []).map((p) => ({ name: p.name }));
  } catch {
    return [];
  }
}

const EARTH_RADIUS_KM = 6371;

// Great-circle distance between two points, in km — used by the map
// confirm screen to warn when a picked pin is unrealistically far from the
// device's own GPS fix (e.g. someone testing on a simulator with a stock
// US location while dropping a pin in Kaup/Udupi).
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Meters below 1km (matches how Google/Zepto-style pickers phrase short
// distances — "324 m" reads immediately, "0.3 km" needs a second to parse),
// one decimal km above that. Shared by LocationSearchScreen and
// SelectLocationScreen, both of which show a "Xkm away" line.
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
