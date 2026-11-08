import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLocationStore } from '../store/useLocationStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchAddresses } from '../api/addresses';
import { matchSavedAddress } from '../features/delivery-address/matchSavedAddress';
import { getDeviceLocationFix, isUsableDeviceFix } from './deviceLocation';
import { reverseGeocode } from './geocoding';
import { distanceMeters } from './locationFilter';

// One bounded foreground acquisition, not a continuous/background GPS watch.
// Keep catalogue queries stable for GPS jitter within the same delivery area.
const MIN_MOVE_METERS = 50;

export function useHomeLocationRefresh(enabled: boolean) {
  const hydrated = useLocationStore(s => s.isHydrated);
  const source = useLocationStore(s => s.location?.source);
  useEffect(() => {
    if (!enabled || !hydrated || source === 'manual') return;
    let active = true;
    let pending = false;
    let generation = 0;
    let retryOnResume = false;
    const refresh = async () => {
      if (!active || AppState.currentState !== 'active') return;
      if (pending) { retryOnResume = true; return; }
      const selected = useLocationStore.getState().location;
      if (!selected || selected.source === 'manual') return;
      const ticket = generation;
      // Identity fences discard GPS/geocoder results if the person chooses
      // another address, signs out, navigates away or backgrounds the app.
      const current = () => active && generation === ticket && AppState.currentState === 'active'
        && useLocationStore.getState().location === selected;
      pending = true;
      try {
        // Old installs did not distinguish GPS from saved addresses. Protect
        // a matching saved delivery address before migrating an ambient pin.
        if (!selected.source && useAuthStore.getState().accessToken) {
          const addresses = await fetchAddresses();
          if (!current()) return;
          if (matchSavedAddress(addresses, selected)) {
            await useLocationStore.getState().setLocation({ ...selected, source: 'manual' });
            return;
          }
        }
        const permission = await Location.getForegroundPermissionsAsync();
        if (!current() || permission.status !== 'granted'
          || permission.android?.accuracy === 'coarse' || permission.ios?.accuracy === 'reduced'
          || !await Location.hasServicesEnabledAsync()) return;
        if (!current()) return;
        const fix = await getDeviceLocationFix({ fresh: true });
        if (!current() || !isUsableDeviceFix(fix)
          || distanceMeters(selected, fix) < Math.max(MIN_MOVE_METERS, fix.accuracy * 2)) return;
        const address = await reverseGeocode(fix);
        if (!current() || address.resolved === false || !address.addressLabel.trim()) return;
        await useLocationStore.getState().setLocation({ latitude: fix.latitude, longitude: fix.longitude,
          addressLabel: address.addressLabel, city: address.city, source: 'device' });
      } catch {
        // Denied permission, unavailable GPS/network, or persistence failure:
        // keep the last usable area; never substitute an invented coordinate.
      } finally {
        pending = false;
        if (retryOnResume) { retryOnResume = false; void refresh(); }
      }
    };
    void refresh();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      const resumed = state === 'active' && previous !== 'active';
      previous = state;
      if (state !== 'active') generation += 1;
      if (resumed) void refresh();
    });
    return () => { active = false; listener.remove(); };
  }, [enabled, hydrated, source]);
}
