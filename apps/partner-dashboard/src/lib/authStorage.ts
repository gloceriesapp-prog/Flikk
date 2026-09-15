// Session token storage — localStorage, not a cookie. This is a store
// owner's own device (same trust level as the partner mobile app's
// SecureStore session), not a multi-tenant server session that needs
// httpOnly cookie protection against XSS from other users' content; the
// dashboard renders nothing but this store owner's own data. Simplest
// correct choice for a same-day build — swap for a cookie-based SSR
// session (like apps/admin's own magic-link flow) later if this ever
// needs server-rendered pages that require the session before first
// paint.

const ACCESS_TOKEN_KEY = 'flikk_partner_access_token';
const REFRESH_TOKEN_KEY = 'flikk_partner_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
