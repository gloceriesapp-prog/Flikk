import { validateApiUrl } from '../../../../packages/shared/config/api-url.cjs';
// Thin instantiation of @gloceries/shared's createApiClient — the request/error/
// 401-refresh/network-error logic lives in one place (packages/shared/src/
// auth/client.ts), same as apps/customer and apps/partner. A bug fixed once
// in the shared factory reaches all three, instead of being rediscovered
// independently in each (CLAUDE.md's own consistency rule). This file only
// supplies rider's base URL, token getter, refresh, and dead-session clear.

import { createApiClient } from '@gloceries/shared';
import { useAuthStore } from '../store/useAuthStore';

export { ApiError } from '@gloceries/shared';

const API_URL = validateApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);

// Plain fetch, not apiRequest — apiRequest is what calls this on a 401 (via
// the shared client's `refresh` option); routing it through apiRequest itself
// would recurse the moment the refresh call also 401s. See apps/customer's
// client.ts note on why the refresh dance exists (Supabase access tokens are
// short-lived).
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
    return null;
  }
}

// Supabase refresh tokens are single-use — see apps/customer/src/api/
// client.ts's own note on the exact race this in-flight promise prevents
// (multiple concurrent 401s each trying to redeem the same token).
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
  // up while every call 401s forever. (Rider has no guest mode; shared's
  // own token guard is a harmless no-op difference from customer here.)
  onSessionExpired: () => useAuthStore.getState().clear(),
});

export const apiRequest = client.apiRequest;
