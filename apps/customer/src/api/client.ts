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
import { publishAccountBlocked } from './accountBlocked';
import { API_BASE_URL } from './baseUrl';
import { useAuthStore } from '../store/useAuthStore';

export { ApiError } from '@gloceries/shared';

// 15s covers a slow 3G round trip; anything longer reads as a hung app.
// Pass a larger timeoutMs for uploads/long-running calls.
export const REQUEST_TIMEOUT_MS = 15000;
export class RequestTimeoutError extends ApiError {
  constructor() {
    super(0, 'REQUEST_TIMEOUT', 'The server is taking too long to respond. Please try again.');
  }
}
type ApiRequestOptions = Parameters<ReturnType<typeof createApiClient>['apiRequest']>[1] & { timeoutMs?: number };

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
// by the payment-order-create call) can each independently try to redeem the
// SAME stored refresh token in parallel; only the first succeeds, the rest
// reuse an already-consumed token and get rejected. One shared in-flight
// promise makes every concurrent 401 await and reuse the same real refresh
// instead of racing separate ones (this exact race was a real bug on partner).
// Admin blocked this customer (backend 403 ACCOUNT_BLOCKED on any
// authenticated call or token refresh). Sign out once and say why, instead of
// leaving the shell up while every call fails; the login screen shows the
// same message if they try to sign back in.
let blockedEpoch: number | null = null;
async function signOutBlocked(epoch: number, message: string): Promise<void> {
  if (blockedEpoch === epoch || useAuthStore.getState().sessionEpoch !== epoch) return;
  blockedEpoch = epoch;
  await useAuthStore.getState().clear();
  publishAccountBlocked(message);
}

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
export async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
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
  // Our own deadline layered on the caller's signal: the shared client reports
  // any caller-side abort as REQUEST_CANCELLED, so translate ours back here.
  const deadline = new AbortController();
  const callerSignal = options?.signal;
  const cancel = () => deadline.abort();
  if (callerSignal?.aborted) cancel();
  callerSignal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; deadline.abort(); }, options?.timeoutMs ?? REQUEST_TIMEOUT_MS);
  let result: T;
  try {
    result = await client.apiRequest<T>(path, { ...options, signal: deadline.signal });
  } catch (error) {
    if (error instanceof ApiError && (timedOut || error.code === 'REQUEST_TIMEOUT')) throw new RequestTimeoutError();
    if (error instanceof ApiError && error.code === 'ACCOUNT_BLOCKED' && snapshot.accessToken) void signOutBlocked(snapshot.sessionEpoch, error.message);
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
  }
  if (options?.auth !== false && useAuthStore.getState().sessionEpoch !== snapshot.sessionEpoch) {
    throw new ApiError(409, 'SESSION_CHANGED', 'Your account changed. Please retry.');
  }
  if (scoped && useLocationStore.getState().location !== pin) throw new ApiError(409, 'LOCATION_CHANGED', 'Your delivery location changed. Please retry.');
  return result;
}
