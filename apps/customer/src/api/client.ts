import { useLocationStore } from '../store/useLocationStore';
// Thin instantiation of @gloceries/shared's createApiClient — the actual
// fetch/error-shaping/401-refresh/network-error logic now lives in one place
// (packages/shared/src/auth/client.ts) instead of being hand-copied per app
// (this file used to carry the whole thing). This file's only job is
// supplying this app's own base URL, its session-token getter (useAuthStore),
// its refresh callback, and — customer-specific — the guest-safe dead-session
// recovery. Re-exports `apiRequest`/`ApiError` under their original names so
// every existing call site in this app keeps working unchanged.

import { ApiError, createApiClient } from '@gloceries/shared';
import { API_BASE_URL } from './baseUrl';
import { useAuthStore } from '../store/useAuthStore';

export { ApiError } from '@gloceries/shared';

// Plain fetch, not this file's own apiRequest — apiRequest is what calls this
// on a 401 (via the shared client's `refresh` option below); routing it
// through apiRequest itself would recurse the moment the refresh call also
// came back 401. Not api/auth.ts's refreshSession either, to avoid a circular
// import. See useAuthStore.ts's own note on why this exists at all — no
// refresh token ever meant every session died the moment its 1hr access
// token expired, surfacing as "Invalid or expired session" on whatever screen
// happened to make the next authenticated call (checkout, most visibly).
async function doRefresh(): Promise<string | null> {
  const { refreshToken, sessionEpoch } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const refreshClient = createApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => null });
    const { access_token, refresh_token } = await refreshClient.apiRequest<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST', auth: false, body: { refresh_token: refreshToken },
    });
    if (useAuthStore.getState().sessionEpoch !== sessionEpoch || useAuthStore.getState().refreshToken !== refreshToken) return null;
    await useAuthStore.getState().setTokens(access_token, refresh_token);
    if (useAuthStore.getState().sessionEpoch !== sessionEpoch) return null;
    return access_token;
  } catch (error) {
    if (error instanceof ApiError && [400, 401].includes(error.status)) return null;
    // An outage is not revocation. Preserve the session for a later retry.
    throw error instanceof ApiError ? error : new ApiError(503, 'SESSION_STORAGE_UNAVAILABLE', 'Could not save your session. Please retry.');
  }
}

// Supabase refresh tokens are single-use — redeeming one issues a new one and
// invalidates the old. Multiple authenticated calls firing close together on
// an expired access token (e.g. checkout's order-create immediately followed
// by the Razorpay-order-create call) can each independently try to redeem the
// SAME stored refresh token in parallel; only the first succeeds, the rest
// reuse an already-consumed token and get rejected. One shared in-flight
// promise makes every concurrent 401 await and reuse the same real refresh
// instead of racing separate ones (this exact race was a real bug on partner).
let inFlightRefresh: { epoch: number; work: Promise<string | null> } | null = null;
function refreshAccessToken(epoch: number): Promise<string | null> {
  if (useAuthStore.getState().sessionEpoch !== epoch) return Promise.resolve(null);
  if (!inFlightRefresh || inFlightRefresh.epoch !== epoch) {
    const work = doRefresh().finally(() => { if (inFlightRefresh?.work === work) inFlightRefresh = null; });
    inFlightRefresh = { epoch, work };
  }
  return inFlightRefresh.work;
}

// Bind each request and its refresh/expiry callbacks to the starting session.
// An old 401 must never retry with another customer's credentials or log out
// the new account. Fetch connections are still shared by the native runtime.
export async function apiRequest<T>(path: string, options?: Parameters<ReturnType<typeof createApiClient>['apiRequest']>[1]): Promise<T> {
  const snapshot = useAuthStore.getState();
  const pin = useLocationStore.getState().location;
  const scoped = /^\/(?:browse\/|stores(?:\?|$)|stores\/products\/|categories\/.+\/products|orders\/buy-it-again)/.test(path);
  if (scoped && pin) path += `${path.includes('?') ? '&' : '?'}lat=${pin.latitude}&lng=${pin.longitude}`;
  const client = createApiClient({
    baseUrl: API_BASE_URL,
    getAccessToken: () => snapshot.accessToken,
    refresh: () => refreshAccessToken(snapshot.sessionEpoch),
    onSessionExpired: () => {
      if (useAuthStore.getState().sessionEpoch === snapshot.sessionEpoch) return useAuthStore.getState().clear();
    },
  });
  const result = await client.apiRequest<T>(path, options);
  if (options?.auth !== false && useAuthStore.getState().sessionEpoch !== snapshot.sessionEpoch) {
    throw new ApiError(409, 'SESSION_CHANGED', 'Your account changed. Please retry.');
  }
  if (scoped && useLocationStore.getState().location !== pin) throw new ApiError(409, 'LOCATION_CHANGED', 'Your delivery location changed. Please retry.');
  return result;
}
