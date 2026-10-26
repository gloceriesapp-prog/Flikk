// Device permissions/GPS and address-provider helpers. Reverse geocoding
// prefers the backend's Google service, then the device-native geocoder.
// Both calls are bounded; server credentials never enter the mobile bundle.
// An unresolved result is explicit, so a UI placeholder cannot become an
// apparently verified delivery address.

import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { apiRequest } from '../api/client';
import { withDeadline } from '../utils/deadline';
import { getDeviceLocationFix } from './deviceLocation';

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
  // Existing permission needs no dialog or Activity-settling delay.
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') return acceptLocationPrecision(existing);
  const permission = await Location.requestForegroundPermissionsAsync();
  const { status } = permission;
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
  return status === 'granted' && acceptLocationPrecision(permission);
}

function acceptLocationPrecision(permission: Location.LocationPermissionResponse): boolean {
  if (permission.android?.accuracy !== 'coarse' && permission.ios?.accuracy !== 'reduced') return true;
  Alert.alert('Enable precise location',
    'Your phone is sharing an approximate area. Enable Precise Location in Settings for an accurate delivery pin, or choose your pin manually.',
    [{ text: 'Choose manually', style: 'cancel' }, { text: 'Open Settings', onPress: () => { void Linking.openSettings().catch(() => undefined); } }]);
  return false;
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  // High, not Balanced — this fix becomes the map's starting pin position
  // and, once confirmed, the actual delivery address. A rider follows this
  // exact point, so it's worth the extra second+battery over a coarser fix.
  const fix = await getDeviceLocationFix();
  return { latitude: fix.latitude, longitude: fix.longitude };
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
  // False means no provider supplied an address for this pin. Callers must
  // show a retry/manual-address state rather than treating a placeholder as
  // a verified address. Optional for existing navigation/profile callers.
  resolved?: boolean;
}

const SERVER_GEOCODE_TIMEOUT_MS = 8000;
const NATIVE_GEOCODE_TIMEOUT_MS = 3000;
const UNRESOLVED_ADDRESS: ReverseGeocodeResult = {
  addressLabel: '', city: '', shortName: 'Pinned location', resolved: false,
};
function usableLabel(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim()
    && !/^(selected|pinned) location$/i.test(value.trim());
}

// Coordinates -> human-readable label, used to prefill the confirm screen and
// the final saved address line. Tries the real Google-backed backend proxy
// first; falls back to the on-device geocoder on any failure (network,
// timeout, key not configured server-side). Preserve the selected coordinate
// even when neither provider can supply its address.
export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)
    || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) return { ...UNRESOLVED_ADDRESS };
  const fromGoogle = await reverseGeocodeViaGoogle(coords);
  if (fromGoogle) return fromGoogle;

  const results = await withDeadline(Location.reverseGeocodeAsync(coords), NATIVE_GEOCODE_TIMEOUT_MS).catch(() => []);
  const first = results[0];
  if (!first) return { ...UNRESOLVED_ADDRESS };

  // Android's own system geocoder (what this call resolves to there) can
  // hand back a bare Plus Code as `name` for a rural point with nothing
  // closer-by named — same real-but-unhelpful-headline problem
  // backend/src/routes/location.ts's own Google-proxy route already
  // guards against for ITS path; this is the on-device fallback path,
  // reached whenever the server call fails, so it needs the same guard.
  const isPlusCode = first.name ? /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(first.name) : false;
  const namedTitle = isPlusCode ? null : first.name;
  const street = [first.streetNumber, first.street].filter(Boolean).join(' ');
  const parts = [namedTitle, street, first.district, first.city, first.region, first.postalCode]
    .filter((part): part is string => usableLabel(part)).map(part => part.trim());
  const unique = parts.filter((part, index) => parts.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index);
  const addressLabel = unique.join(', ');
  if (!usableLabel(addressLabel)) return { ...UNRESOLVED_ADDRESS };
  const city = first.city ?? first.district ?? first.subregion ?? '';
  const shortName = namedTitle || first.street || first.district || city || addressLabel;
  return { addressLabel, city, shortName, resolved: true };
}

async function reverseGeocodeViaGoogle(coords: Coordinates): Promise<ReverseGeocodeResult | null> {
  try {
    const data = await apiRequest<{ addressLabel: string | null; shortName?: string; city?: string }>(`/location/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`, { auth: false, timeoutMs: SERVER_GEOCODE_TIMEOUT_MS });
    if (!usableLabel(data.addressLabel)) return null;
    return { addressLabel: data.addressLabel.trim(), city: data.city?.trim() ?? '',
      shortName: usableLabel(data.shortName) ? data.shortName.trim() : data.addressLabel.trim(), resolved: true };
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
