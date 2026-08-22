// Drives the "use my current location" flow for StoreProfileHeader's
// district line — a user-triggered fetch (see LocationPermissionBanner.tsx),
// never a silent background request on app open. A shop's location doesn't
// move between sessions, so asking every time would just be a nag; asking
// once, on request, respects that this is a one-time convenience, not a
// live-tracking feature (that stays out of scope per CLAUDE.md).

import { useState } from 'react';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocodeDistrict, type Coordinates } from './geocoding';

export type LiveDistrictStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

interface UseLiveDistrictResult {
  status: LiveDistrictStatus;
  district: string | null;
  // Only set once status is 'granted' — StoreSetupScreen's map card plots
  // this; every existing caller (Store Settings) ignores it and keeps
  // working off district alone.
  coordinates: Coordinates | null;
  requestLiveDistrict: () => Promise<void>;
}

export function useLiveDistrict(): UseLiveDistrictResult {
  const [status, setStatus] = useState<LiveDistrictStatus>('idle');
  const [district, setDistrict] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  async function requestLiveDistrict() {
    setStatus('requesting');
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setStatus('denied');
        return;
      }
      const coords = await getCurrentCoordinates();
      const resolved = await reverseGeocodeDistrict(coords);
      if (!resolved) {
        setStatus('error');
        return;
      }
      setDistrict(resolved);
      setCoordinates(coords);
      setStatus('granted');
    } catch {
      setStatus('error');
    }
  }

  return { status, district, coordinates, requestLiveDistrict };
}
