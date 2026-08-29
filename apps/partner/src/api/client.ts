// Thin instantiation of @flikk/shared's createApiClient — the actual
// fetch/error-shaping logic now lives in one place (packages/shared/src/
// auth/client.ts) instead of being hand-copied per app; this file's only
// job is supplying this app's own base URL and its own session-token
// getter (useAuthStore), which the shared factory takes as plain
// parameters rather than importing any app's store directly. Re-exports
// `apiRequest`/`ApiError` under their original names so every existing
// call site in this app (storeOnboarding calls, etc. — not just the OTP
// endpoints) keeps working unchanged.

import { createApiClient } from '@flikk/shared';
import { useAuthStore } from '../store/useAuthStore';

export { ApiError } from '@flikk/shared';

// Fallback only matters when EXPO_PUBLIC_API_URL is unset — backend/Express
// listens on 4000, not 3000 (that's apps/admin's Next.js dev server). A
// wrong fallback here silently points every request at the wrong server
// instead of failing loudly — exactly what happened before .env got this
// var added (see that file's own note).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const client = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => useAuthStore.getState().accessToken,
});

export const apiRequest = client.apiRequest;
