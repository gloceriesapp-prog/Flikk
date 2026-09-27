// Auto-online driver — mounted once high in the authed app (AppNavigator).
// If the rider has switched on "go online automatically during these hours"
// and the current IST moment falls inside one of their enabled windows, this
// flips them online for them so they don't have to remember to. Deliberately
// one-directional: it NEVER auto-goes-offline (a rider stepping away mid-shift
// shouldn't be yanked back online, and going offline is always a deliberate
// act), and it NEVER forces a location permission prompt — it checks the
// already-granted status silently and simply doesn't fire if location was
// never granted (goOnline itself also guards on the grant, so this is belt-
// and-suspenders, not the only gate).
//
// Re-evaluated on mount, on every AppState → 'active' (returning to the app is
// the natural moment a new window may have opened), and on a lightweight 60s
// interval. ponytail: 60s poll — cheap at this scale (one in-memory schedule
// check, no network), and a minute of latency on "should be online now" is
// invisible to a rider. Availability itself is only re-fetched on mount and on
// foreground, not every tick.

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useRiderOrdersStore } from '../store/useRiderOrdersStore';
import { fetchAvailability, type DaySchedule } from '../api/availability';
import { isWithinSchedule } from '../lib/riderSchedule';

// ponytail: 60s re-check — see header note.
const RECHECK_INTERVAL_MS = 60_000;

export function useAutoOnline() {
  const goOnline = useRiderOrdersStore((s) => s.goOnline);

  // Latest fetched config, read inside the loop/listener without re-subscribing
  // them each time it changes.
  const configRef = useRef<{ availability: DaySchedule[]; autoOnline: boolean }>({ availability: [], autoOnline: false });

  useEffect(() => {
    let cancelled = false;

    async function refreshConfig() {
      try {
        const cfg = await fetchAvailability();
        if (!cancelled) configRef.current = cfg;
      } catch {
        // Not-yet-approved rider / network blip — leave the last known config
        // (defaults to "off"), try again on the next foreground.
      }
    }

    async function maybeGoOnline() {
      const { availability, autoOnline } = configRef.current;
      if (!autoOnline) return;
      // Only ever transition offline → online; never re-fire while already
      // online, never pull someone offline.
      if (useRiderOrdersStore.getState().isOnline) return;
      if (!isWithinSchedule(availability, new Date())) return;
      // Silent permission read — MUST NOT prompt. If location was never
      // granted, do nothing (goOnline would fail its own grant check anyway).
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      if (useRiderOrdersStore.getState().isOnline) return; // re-check after the await
      void goOnline();
    }

    // Prime config, then evaluate once we (probably) have it.
    void refreshConfig().then(() => {
      if (!cancelled) void maybeGoOnline();
    });

    const interval = setInterval(() => void maybeGoOnline(), RECHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshConfig().then(() => void maybeGoOnline());
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [goOnline]);
}
