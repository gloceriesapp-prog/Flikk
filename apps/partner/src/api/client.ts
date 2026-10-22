// Thin instantiation of @gloceries/shared's createApiClient — the actual
// fetch/error-shaping logic now lives in one place (packages/shared/src/
// auth/client.ts) instead of being hand-copied per app; this file's only
// job is supplying this app's own base URL and its own session-token
// getter (useAuthStore), which the shared factory takes as plain
// parameters rather than importing any app's store directly. Re-exports
// `apiRequest`/`ApiError` under their original names so every existing
// call site in this app (storeOnboarding calls, etc. — not just the OTP
// endpoints) keeps working unchanged.

import { ApiError, createApiClient } from '@gloceries/shared';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from './baseUrl';
import { requestSessionRefresh } from './refreshSession';

// Plain fetch, not this file's own apiRequest — apiRequest is what calls
// this on a 401 (via the shared client's own `refresh` option below);
// routing this through apiRequest itself would recurse the moment the
// refresh call also came back 401. See useAuthStore.ts's own note on why
// this exists — no refresh token ever meant every session died the moment
// its 1hr access token expired, misread as a real logout.
// A request is bound to the account that started it, including every retry.
// A late 401 from account A must neither refresh nor log out account B.
import { getSessionEpoch, isCurrentSession } from '../store/sessionScope';

export { ApiError };

// Fallback only matters when EXPO_PUBLIC_API_URL is unset — backend/Express
// listens on 4000, not 3000 (that's apps/admin's Next.js dev server). A
// wrong fallback here silently points every request at the wrong server
// instead of failing loudly — exactly what happened before .env got this
// var added (see that file's own note).
const API_URL = API_BASE_URL;

const refreshes = new Map<number, Promise<string | null>>();
async function doRefresh(epoch: number): Promise<string | null> {
  if (!isCurrentSession(epoch)) return null;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  const body = await requestSessionRefresh(API_URL, refreshToken);
  if (!body || !isCurrentSession(epoch)) return null;
  await useAuthStore.getState().setTokens(body.access_token, body.refresh_token, epoch);
  return isCurrentSession(epoch) ? body.access_token : null;
}
function refreshAccessToken(epoch: number): Promise<string | null> {
  let pending = refreshes.get(epoch);
  if (!pending) {
    pending = doRefresh(epoch).finally(() => refreshes.delete(epoch));
    refreshes.set(epoch, pending);
  }
  return pending;
}

export async function apiRequest<T>(path: string, options?: Parameters<ReturnType<typeof createApiClient>['apiRequest']>[1]): Promise<T> {
  const epoch = getSessionEpoch();
  const assertCurrent = () => {
    if (!isCurrentSession(epoch)) throw new ApiError(0, 'SESSION_CHANGED', 'Your account changed. Please try again.');
  };
  const client = createApiClient({
    baseUrl: API_URL,
    getAccessToken: () => { assertCurrent(); return useAuthStore.getState().accessToken; },
    refresh: () => refreshAccessToken(epoch),
    onSessionExpired: () => isCurrentSession(epoch) ? useAuthStore.getState().clear() : undefined,
  });
  try {
    const result = await client.apiRequest<T>(path, options);
    assertCurrent();
    return result;
  } catch (err) {
    assertCurrent();
    if (err instanceof ApiError && err.code === 'PARTNER_SUSPENDED' && !useAuthStore.getState().partnerSuspended) {
      useAuthStore.getState().setPartnerSuspension(true, null);
    }
    throw err;
  }
}
