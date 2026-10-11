// One live, filtered device position for the map screen: the blue dot is
// drawn from it and "Use my current location" moves the pin to it, so the
// two can never disagree (they used to come from two different sources:
// the map SDK's own dot and separate one-off GPS reads).
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { filterFix, type FilteredFix } from './locationFilter';

export function useLiveLocation(enabled: boolean): FilteredFix | null {
  const [fix, setFix] = useState<FilteredFix | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let subscription: Location.LocationSubscription | null = null;
    let current: FilteredFix | null = null;

    (async () => {
      // Android's "Google Location Accuracy" (Wi-Fi + cell assisted fixes)
      // is what gets an indoor fix from ~50 m down to ~10 m. Shows the
      // system "turn on location accuracy" prompt only if it is off.
      if (Platform.OS === 'android') await Location.enableNetworkProviderAsync().catch(() => undefined);
      if (!active) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (position) => {
          if (!active) return;
          const next = filterFix(current, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
          // A rejected jump returns the same position: no re-render.
          if (current && next.latitude === current.latitude && next.longitude === current.longitude && next.accuracy === current.accuracy) {
            current = next;
            return;
          }
          current = next;
          setFix(next);
        },
      ).catch(() => null);
      if (!active) subscription?.remove();
    })();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled]);

  return fix;
}
