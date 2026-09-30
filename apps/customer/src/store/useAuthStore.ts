// Session state. Token persisted in SecureStore, never AsyncStorage/plaintext —
// see specs/00-foundation/auth-and-roles.md: "Session tokens stored via SecureStore
// (mobile) ... not plaintext local storage."
//
// refreshToken persists alongside accessToken — access tokens are
// short-lived (1hr, backend's own note on POST /auth/otp/verify). Without
// a refresh token, any authenticated call made after that hour (e.g.
// POST /orders at checkout, with items already sitting in the cart a
// while) hits a real 401 "Invalid or expired session" with nothing able
// to recover it — the exact bug this fixes, same root cause and same fix
// already applied on the partner app (apps/partner/src/store/
// useAuthStore.ts's own note). api/client.ts's `refresh` handling uses
// setTokens below to keep both current, silently, before a 401 ever
// reaches a screen as a hard error.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'gloceries_customer_access_token';
const REFRESH_TOKEN_KEY = 'gloceries_customer_refresh_token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean; // true once we've checked SecureStore on cold start
  // Browse-without-login (LoginScreen.tsx's own Skip button). In-memory
  // only, not persisted to SecureStore — there's no real identity behind
  // it, so it deliberately doesn't survive a cold start; a relaunched app
  // lands back on Login, same as never having skipped. RootNavigator
  // mounts the real app shell for accessToken OR isGuest, but every
  // authenticated backend call still requires a real token — a guest can
  // browse, not check out, add reviews, etc.; screens that need a real
  // session check accessToken themselves (ProfileScreen.tsx's own guest
  // branch is the first of these).
  isGuest: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, refreshToken: string) => Promise<void>;
  // Called only by api/client.ts's `refresh` callback after a successful
  // silent token refresh.
  setTokens: (token: string, refreshToken: string) => Promise<void>;
  clear: () => Promise<void>;
  continueAsGuest: () => void;
  // Drops guest mode and sends the person back to the real login flow —
  // called from ProfileScreen.tsx's own "Log in" prompt, not from clear()
  // (clear() is a real logout of a real session; exiting guest mode never
  // had a session to log out of).
  exitGuestMode: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  isGuest: false,

  hydrate: async () => {
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken: token, refreshToken, isHydrated: true });
  },

  setSession: async (token, refreshToken) => {
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)]);
    set({ accessToken: token, refreshToken, isGuest: false });
  },

  setTokens: async (token, refreshToken) => {
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)]);
    set({ accessToken: token, refreshToken });
  },

  clear: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
    set({ accessToken: null, refreshToken: null, isGuest: false });
  },

  continueAsGuest: () => set({ isGuest: true }),
  exitGuestMode: () => set({ isGuest: false }),
}));
