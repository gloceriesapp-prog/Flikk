// Keeps the rider's presence (riders.status/current_lat/current_lng, what
// lib/riderDispatch.ts's nearby_online_riders RPC reads) fresh even when the
// app is backgrounded or killed mid-shift. useRiderOrdersStore's own
// LOCATION_PING_INTERVAL_MS loop only runs while the JS runtime is alive
// (app foregrounded) — the moment the OS suspends it, those setInterval
// pings freeze and a rider who pocketed the phone silently stops receiving
// dispatch. This module is the background half: an expo-location background
// task the OS drives on its own schedule, posting the same PATCH /rider/status.
//
// A relaunched headless task has a FRESH JS context — useAuthStore is empty,
// so apiRequest (which reads the in-memory token) can't be used here. The
// task reads the session token straight from SecureStore, POSTs a plain
// fetch, and on a 401 does one refresh-and-retry (Supabase access tokens are
// short-lived; a multi-hour shift would otherwise 401 every background ping
// after the first hour), persisting the new tokens back to SecureStore so the
// foreground app picks them up too.
//
// Needs a native dev build — background location + the foreground service
// aren't available in plain Expo Go (same native-build gate the map already
// has). Requires the "Always"/background location grant (app.config.js), a
// separate OS prompt from when-in-use; if the rider declines it, this simply
// no-ops and the foreground ping loop still covers app-open time.

import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../store/useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

// Must match the string TaskManager.defineTask registers under — the OS
// relaunches into the task by this name.
export const RIDER_LOCATION_TASK = 'gloceries-rider-location';

// Same cadence as the foreground loop (useRiderOrdersStore's
// LOCATION_PING_INTERVAL_MS) — fresh enough for a 3-8km dispatch radius,
// not turn-by-turn precision. distanceInterval gives the OS a second reason
// to wake us (rider moved 50m) so a stationary rider isn't pinged needlessly.
const PING_INTERVAL_MS = 45_000;
const PING_DISTANCE_M = 50;

async function postStatus(token: string, lat: number, lng: number): Promise<number> {
  const res = await fetch(`${API_URL}/rider/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'online', lat, lng }),
  });
  return res.status;
}

// Single-use refresh, straight against SecureStore — mirrors client.ts's
// doRefresh but can't share it (that one writes through useAuthStore, which
// is empty in this context). Returns the new access token, or null if the
// session is genuinely dead (rider will re-auth next time they open the app).
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const { access_token, refresh_token } = (await res.json()) as { access_token: string; refresh_token: string };
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
    return access_token;
  } catch {
    return null;
  }
}

// defineTask runs at module load (global scope) — required so the task is
// registered before the OS ever relaunches the app into it. This module is
// imported by useRiderOrdersStore, which the navigator loads on cold start.
TaskManager.defineTask(RIDER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const loc = (data as { locations?: Location.LocationObject[] } | null)?.locations?.at(-1);
  if (!loc) return;

  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null);
  if (!token) return; // logged out — nothing to report

  const { latitude, longitude } = loc.coords;
  const status = await postStatus(token, latitude, longitude).catch(() => 0);
  if (status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) await postStatus(fresh, latitude, longitude).catch(() => {});
  }
});

export async function startBackgroundLocation(): Promise<void> {
  // Background ("Always") grant is a separate OS prompt from when-in-use.
  // Declining it isn't an error — the foreground ping loop still works, the
  // rider just won't stay visible to dispatch once the app is suspended.
  //
  // requestBackgroundPermissionsAsync THROWS (ERR_LOCATION_INFO_PLIST), not
  // just returns denied, when the running binary's Info.plist lacks the
  // background-location entitlement — i.e. plain Expo Go, or a dev client
  // built before app.config.js's UIBackgroundModes/permissions landed. Same
  // no-op-and-degrade path as a declined grant, so swallow it rather than
  // let it surface as an uncaught promise rejection.
  let status: Location.PermissionStatus;
  try {
    ({ status } = await Location.requestBackgroundPermissionsAsync());
  } catch {
    return;
  }
  if (status !== 'granted') return;

  const already = await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK).catch(() => false);
  if (already) return;

  await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: PING_INTERVAL_MS,
    distanceInterval: PING_DISTANCE_M,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: false,
    // Android requires a persistent foreground-service notification for
    // background location — this is also the honest UX signal ("you're
    // sharing location because you're online"), not just a platform tax.
    foregroundService: {
      notificationTitle: 'Gloceries — you are online',
      notificationBody: 'Sharing your location so you can receive delivery offers. Go offline to stop.',
    },
  });
}

export async function stopBackgroundLocation(): Promise<void> {
  const already = await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK).catch(() => false);
  if (already) await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK).catch(() => {});
}
