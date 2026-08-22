// Thin wrapper around expo-location's device-native geocoder. Free, no API
// key — the device's own Apple/Google geocoding framework does the work.
// Lives here (not copied per-app) because it was genuinely duplicated
// between apps/customer and apps/partner — see this package's own
// README-equivalent note in packages/shared/src/index.ts for when to add
// something new here vs. keep it copied per-app.

import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

// Coordinates -> just the city/district name, e.g. "Udupi" — falls back
// through district -> subregion -> region since not every reverse-geocode
// result populates all of them the same way across providers/regions.
export async function reverseGeocodeDistrict(coords: Coordinates): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync(coords);
  const first = results[0];
  if (!first) return null;
  return first.district ?? first.subregion ?? first.region ?? first.city ?? null;
}

// Fuller "building/street, district" label for a map-pin confirm screen —
// district alone (above) is enough for a store/delivery record, but a pin-
// drag UI needs to show roughly which building it's pointing at, same as
// Blinkit/Zepto's pin-confirm screen labels the pin, not just the city.
export async function reverseGeocodeAddress(coords: Coordinates): Promise<string | null> {
  const results = await Location.reverseGeocodeAsync(coords);
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

// Backend base URL — same EXPO_PUBLIC_API_URL convention as each app's own
// api/client.ts (that var is meant for client bundles, safe to read here).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Free-text search for a location search bar, via /backend's Mappls
// Autosuggest proxy (backend/src/routes/location.ts) — real India-aware
// place suggestions, not a fixed static list. Mappls's free tier returns
// labels only, never coordinates (that's a premium-gated field on their
// side, confirmed against their docs) — so each label is resolved to
// actual coordinates via the free on-device geocoder below, same
// mechanism reverseGeocodeAddress already relies on.
//
// If the backend call fails outright (unreachable, no MAPPLS_ACCESS_TOKEN
// configured yet, etc.) this falls back to querying the on-device geocoder
// directly with the raw typed text — worse coverage, but search must never
// go silently blank just because the backend proxy isn't up.
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
