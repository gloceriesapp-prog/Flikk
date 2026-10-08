import { validateApiUrl } from '../../../../packages/shared/config/api-url.cjs';
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

export { ApiError };

// Fallback only matters when EXPO_PUBLIC_API_URL is unset — backend/Express
// listens on 4000, not 3000 (that's apps/admin's Next.js dev server). A
// wrong fallback here silently points every request at the wrong server
// instead of failing loudly — exactly what happened before .env got this
// var added (see that file's own note).
const API_URL = validateApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);

// Plain fetch, not this file's own apiRequest — apiRequest is what calls
// this on a 401 (via the shared client's own `refresh` option below);
// routing this through apiRequest itself would recurse the moment the
// refresh call also came back 401. See useAuthStore.ts's own note on why
// this exists — no refresh token ever meant every session died the moment
// its 1hr access token expired, misread as a real logout.
async function doRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const { access_token, refresh_token } = (await res.json()) as { access_token: string; refresh_token: string };
    await useAuthStore.getState().setTokens(access_token, refresh_token);
    return access_token;
  } catch {
    // Network blip mid-refresh — surfaces as the original 401 to the
    // caller, same as a genuine refresh failure. Not retried here; the
    // next real request tries again on its own.
    return null;
  }
}

// Supabase refresh tokens are single-use — the moment one is redeemed, a
// new one is issued and the old one stops working. Multiple authenticated
// calls firing close together (RootNavigator's own push-token registration
// + status-check on cold start, or AddProductScreen's photo upload
// immediately followed by the product POST) can each independently hit a
// 401 on the same expired access token and each try to redeem the SAME
// stored refresh token in parallel — only the first actually succeeds; the
// rest reuse an already-consumed token, get rejected, and (this was the
// real bug: "adding something / reloading logs me out") that rejection
// read as a genuinely dead session and logged the whole app out, even
// though the very first refresh call right next to it had just succeeded.
// One shared in-flight promise makes every concurrent 401 await and reuse
// the same real refresh instead of racing separate ones.
let inFlightRefresh: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

const client = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: refreshAccessToken,
  // Refresh couldn't recover a session that had a token — clear so
  // RootNavigator bounces back to AuthNavigator instead of the shell staying
  // up while every call 401s forever. Same recovery customer/rider have;
  // partner had none before the shared factory grew this hook.
  onSessionExpired: () => useAuthStore.getState().clear(),
});

// Any partner route answers 403 PARTNER_SUSPENDED once Gloceries suspends
// this partner account (backend requireActivePartner) — flip the app to the
// blocking PartnerSuspendedScreen right away instead of failing call by call.
// The screen re-reads the reason from GET /auth/me.
export async function apiRequest<T>(path: string, options?: Parameters<typeof client.apiRequest>[1]): Promise<T> {
  try {
    return await client.apiRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PARTNER_SUSPENDED' && !useAuthStore.getState().partnerSuspended) {
      useAuthStore.getState().setPartnerSuspension(true, null);
    }
    throw err;
  }
}
