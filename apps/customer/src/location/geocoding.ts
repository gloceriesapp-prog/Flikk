// Thin wrapper around expo-location's device-native geocoder. Free, no API
// key — the device's own Apple/Google geocoding framework does the work.
// Good enough for "search an address, drop a pin" at MVP scale; not a live
// autocomplete-as-you-type (that needs Google Places, a paid API — see
// specs/00-foundation/environments-and-config.md's cost ceiling before adding it).

import * as Location from 'expo-location';

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
  return status === 'granted';
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  // High, not Balanced — this fix becomes the map's starting pin position
  // and, once confirmed, the actual delivery address. A rider follows this
  // exact point, so it's worth the extra second+battery over a coarser fix.
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export interface ReverseGeocodeResult {
  addressLabel: string;
  // Header/list display only ever wants the city, not the full street
  // address — kept separate from addressLabel rather than parsed back out
  // of it later, since expo-location already hands back city as its own
  // field.
  city: string;
}

// Coordinates -> human-readable label, used to prefill the confirm screen and
// the final saved address line.
export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodeResult> {
  const results = await Location.reverseGeocodeAsync(coords);
  const first = results[0];
  if (!first) return { addressLabel: 'Selected location', city: '' };

  const parts = [first.name, first.street, first.district, first.city].filter(Boolean);
  const addressLabel = parts.length > 0 ? parts.join(', ') : 'Selected location';
  const city = first.city ?? first.district ?? first.subregion ?? '';
  return { addressLabel, city };
}

// Free-text address -> coordinates, for the manual-search fallback.
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  const results = await Location.geocodeAsync(query);
  const first = results[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
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
