// Thin instantiation of @gloceries/shared's createApiClient — the actual
// fetch/error-shaping/401-refresh/network-error logic now lives in one place
// (packages/shared/src/auth/client.ts) instead of being hand-copied per app
// (this file used to carry the whole thing). This file's only job is
// supplying this app's own base URL, its session-token getter (useAuthStore),
// its refresh callback, and — customer-specific — the guest-safe dead-session
// recovery. Re-exports `apiRequest`/`ApiError` under their original names so
// every existing call site in this app keeps working unchanged.

import { createApiClient } from '@gloceries/shared';
import { useAuthStore } from '../store/useAuthStore';

export { ApiError } from '@gloceries/shared';

// Fallback only matters when EXPO_PUBLIC_API_URL is unset (shouldn't
// happen — .env.local always sets it) — backend/Express listens on 4000,
// not 3000 (that's apps/admin's Next.js dev server). A wrong fallback here
// would silently point every request at the wrong server instead of
// failing loudly.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

// Plain fetch, not this file's own apiRequest — apiRequest is what calls this
// on a 401 (via the shared client's `refresh` option below); routing it
// through apiRequest itself would recurse the moment the refresh call also
// came back 401. Not api/auth.ts's refreshSession either, to avoid a circular
// import. See useAuthStore.ts's own note on why this exists at all — no
// refresh token ever meant every session died the moment its 1hr access
// token expired, surfacing as "Invalid or expired session" on whatever screen
// happened to make the next authenticated call (checkout, most visibly).
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

// Supabase refresh tokens are single-use — redeeming one issues a new one and
// invalidates the old. Multiple authenticated calls firing close together on
// an expired access token (e.g. checkout's order-create immediately followed
// by the Razorpay-order-create call) can each independently try to redeem the
// SAME stored refresh token in parallel; only the first succeeds, the rest
// reuse an already-consumed token and get rejected. One shared in-flight
// promise makes every concurrent 401 await and reuse the same real refresh
// instead of racing separate ones (this exact race was a real bug on partner).
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
  // Fires only when a request that HAD a token 401s and refresh couldn't
  // recover it (shared's own `token &&` guard is the guest guard — a guest
  // with no token never trips this, so a stray auth call doesn't bounce them
  // to login). Clearing here is what makes RootNavigator naturally return to
  // AuthNavigator instead of the shell staying up while every call 401s.
  onSessionExpired: () => useAuthStore.getState().clear(),
});

export const apiRequest = client.apiRequest;
