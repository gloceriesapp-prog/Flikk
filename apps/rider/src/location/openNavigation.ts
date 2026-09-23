// "Navigate" = hand off to the rider's real maps app for turn-by-turn — same
// pattern Blinkit/Swiggy/Uber use, not an in-app nav SDK (paid, native, heavy).
// The in-app DeliveryMapView stays for "am I close?" context; THIS is the
// actual driving directions. Free, no API key, no new dep — just a deep-link.
//
// Android: google.navigation: drops straight into Maps driving mode.
// iOS: prefer the Google Maps app if installed (comgooglemaps://), else Apple
// Maps (maps://). Both platforms fall back to the universal https Maps URL,
// which always resolves (app or browser).

import { Alert, Linking, Platform } from 'react-native';
import type { Coordinates } from './riderLocation';

function isRealCoord(c: Coordinates | null | undefined): c is Coordinates {
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    !(c.latitude === 0 && c.longitude === 0) // {0,0} = null island = no pin on file
  );
}

// Universal, always-resolves deep-link (app if installed, browser otherwise).
function webMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export async function openNavigation(coords: Coordinates | null | undefined, label?: string): Promise<void> {
  if (!isRealCoord(coords)) {
    Alert.alert('No location for this stop', label ? `We don't have map coordinates for ${label} yet.` : 'No map coordinates on file.');
    return;
  }
  const { latitude: lat, longitude: lng } = coords;

  if (Platform.OS === 'android') {
    // google.navigation: is Android-only and Maps is effectively always present.
    await Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => Linking.openURL(webMapsUrl(lat, lng)));
    return;
  }

  // iOS — prefer Google Maps app, fall back to Apple Maps, then web.
  const gmaps = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  if (await Linking.canOpenURL(gmaps).catch(() => false)) {
    await Linking.openURL(gmaps);
    return;
  }
  await Linking.openURL(`maps://?daddr=${lat},${lng}&dirflg=d`).catch(() => Linking.openURL(webMapsUrl(lat, lng)));
}
