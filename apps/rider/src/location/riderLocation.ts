// Thin wrapper around expo-location for the rider's own live position on
// DeliveryMapScreen — a continuous watch, not the one-shot fix
// apps/customer's own geocoding.ts uses for "confirm a pin once." Free, no
// API key (device's own GPS); react-native-maps needs a native dev build
// to render at all (app.config.js's own note), same as apps/customer.

import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
  // Course over ground in degrees from true north, only present while
  // actually moving — GPS reports -1 (or null on some Android builds) when
  // stationary, since there's no direction of travel to derive it from.
  // Used to rotate the rider's arrow marker + camera, Uber-driver-app style.
  heading?: number | null;
}

// Shows the OS prompt — only from a user action (goOnline's tap).
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// Silent read, never prompts. Everything that runs on its own (the presence
// ping, the delivery map) must use this: on Android 14 even an
// already-granted requestForegroundPermissionsAsync() briefly launches the
// system GrantPermissionsActivity, which flips AppState to background and
// back. The foreground resume restarts the ping, which requested again — a
// ~5/s loop that flooded the API into ACCOUNT_RATE_LIMITED (seen on a
// OnePlus, 2026-11-01).
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

// One-shot fix, not a watch — used by useRiderOrdersStore's own goOnline/
// periodic-ping loop (automated dispatch, CLAUDE.md scope override) to
// report the rider's current position to PATCH /rider/status. A
// continuous watchRiderLocation subscription would be wasteful for
// something only sampled every ~45s while online; this is the same
// one-shot pattern apps/customer's own geocoding.ts uses for "confirm a
// pin once."
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const granted = await hasLocationPermission();
  if (!granted) return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

// Fires `onUpdate` with every new fix until the caller cancels — returns
// the subscription's own remove() rather than a bespoke wrapper, so a
// component's cleanup effect is just `return () => sub?.remove()`.
export async function watchRiderLocation(onUpdate: (coords: Coordinates) => void): Promise<{ remove: () => void } | null> {
  const granted = await hasLocationPermission();
  if (!granted) return null;

  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
    (position) =>
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading != null && position.coords.heading >= 0 ? position.coords.heading : null,
      })
  );
}
