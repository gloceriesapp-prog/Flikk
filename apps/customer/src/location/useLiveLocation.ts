// One filtered device position drives the blue dot. Explicit recentering
// reanchors it to the same fresh native reading used by the delivery pin.
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { filterFix, isUsableLocationFix, type FilteredFix, type RawFix } from './locationFilter';
import { getDeviceLocationFix, getRecentDeviceFix, isUsableDeviceFix, rememberDeviceFix } from './deviceLocation';

export function useLiveLocation(enabled: boolean) {
  const [fix, setFix] = useState<FilteredFix | null>(null);
  const filtered = useRef<FilteredFix | null>(null);
  const latestNative = useRef<RawFix | null>(null);
  const published = useRef<FilteredFix | null>(null);

  const publish = useCallback((next: FilteredFix) => {
    filtered.current = next;
    const previous = published.current;
    if (!previous || next.latitude !== previous.latitude || next.longitude !== previous.longitude
      || next.accuracy !== previous.accuracy) {
      published.current = next;
      setFix(next);
    }
  }, []);

  const adoptDeviceFix = useCallback((raw: RawFix): FilteredFix => {
    // An acquisition can finish after a newer watch update. Recenter from
    // that newer usable device reading instead of moving the user backward.
    // Do not replace a substantially more precise result just for recency.
    const latest = latestNative.current;
    const accepted = latest && latest.timestamp > raw.timestamp && isUsableDeviceFix(latest)
      && latest.accuracy <= Math.max((raw.accuracy ?? 0) * 1.5, 25) ? latest : raw;
    if (!isUsableDeviceFix(accepted)) throw new Error('A fresh device location is not available.');
    latestNative.current = accepted;
    rememberDeviceFix(accepted);
    const next = filterFix(null, accepted);
    publish(next);
    return next;
  }, [publish]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let subscription: Location.LocationSubscription | null = null;
    if (filtered.current && Date.now() - filtered.current.timestamp > 15_000) filtered.current = null;

    function acceptFix(raw: RawFix) {
      if (!active || !isUsableLocationFix(raw)) return;
      if (!latestNative.current || raw.timestamp > latestNative.current.timestamp) latestNative.current = raw;
      // The device cache must hold native coordinates, never a stationary
      // display anchor whose timestamp has been advanced by the filter.
      rememberDeviceFix(raw);
      publish(filterFix(filtered.current, raw));
    }

    const recent = getRecentDeviceFix();
    if (recent) acceptFix(recent);
    void getDeviceLocationFix().then(acceptFix, () => undefined);
    // Start the watch independently of Android's optional accuracy prompt.
    if (Platform.OS === 'android') void Location.enableNetworkProviderAsync().catch(() => undefined);
    (async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        position => acceptFix({ latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, timestamp: position.timestamp, speed: position.coords.speed }),
      ).catch(() => null);
      if (!active) subscription?.remove();
    })();

    return () => {
      active = false;
      subscription?.remove();
      // Hide the previous dot on blur, while retaining its filter anchor for
      // a brief focus change. A stale point must not masquerade as live GPS.
      published.current = null;
      setFix(null);
    };
  }, [enabled, publish]);

  return { fix: enabled ? fix : null, adoptDeviceFix };
}
