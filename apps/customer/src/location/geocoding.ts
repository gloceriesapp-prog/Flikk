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
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

// Coordinates -> human-readable label, used to prefill the confirm screen and
// the final saved address line.
export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const results = await Location.reverseGeocodeAsync(coords);
  const first = results[0];
  if (!first) return 'Selected location';

  const parts = [first.name, first.street, first.district, first.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Selected location';
}

// Free-text address -> coordinates, for the manual-search fallback.
export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  const results = await Location.geocodeAsync(query);
  const first = results[0];
  return first ? { latitude: first.latitude, longitude: first.longitude } : null;
}
