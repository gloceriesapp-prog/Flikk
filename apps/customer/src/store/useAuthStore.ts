import { customerIdFromToken, clearAccountCache, resetAccountData } from '../features/account-session/accountCache';
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

const SESSION_KEY = 'gloceries_customer_session_v2';
const TOKEN_KEY = 'gloceries_customer_access_token';
const REFRESH_TOKEN_KEY = 'gloceries_customer_refresh_token';
let pendingSignOut = false;

interface AuthState {
  customerId: string | null;
  sessionEpoch: number;
  accessToken: string | null;
  refreshToken: string | null;
  hydrationError: string | null;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  customerId: null,
  sessionEpoch: 0,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  hydrationError: null,
  isGuest: false,

  hydrate: async () => {
    const epoch = get().sessionEpoch;
    set({ hydrationError: null, isHydrated: false });
    try {
      if (pendingSignOut) {
        await persistSession(null, null);
        pendingSignOut = false;
        if (get().sessionEpoch !== epoch) return;
        set({ customerId: null, accessToken: null, refreshToken: null, isHydrated: true });
        return;
      }
      const session = await SecureStore.getItemAsync(SESSION_KEY);
      let token: string | null; let refreshToken: string | null;
      if (session !== null) {
        const saved = JSON.parse(session);
        if (saved.version !== 2 || (saved.accessToken !== null && typeof saved.accessToken !== 'string')
          || (saved.refreshToken !== null && typeof saved.refreshToken !== 'string')
          || Boolean(saved.accessToken) !== Boolean(saved.refreshToken)) throw new Error('Invalid saved session');
        token = saved.accessToken; refreshToken = saved.refreshToken;
      } else {
        [token, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);
      }
      if (get().sessionEpoch !== epoch) return;
      const customerId = customerIdFromToken(token);
      clearAccountCache();
      set({ customerId, accessToken: customerId ? token : null, refreshToken: customerId ? refreshToken : null, isHydrated: true });
    } catch {
      if (get().sessionEpoch !== epoch) return;
      set({ customerId: null, accessToken: null, refreshToken: null, isHydrated: true,
        hydrationError: pendingSignOut ? 'Couldn’t finish signing out on this device. Unlock it and retry. Your account stays hidden until sign-out finishes.' : 'We couldn’t restore your session. Unlock your device and try again.' });
    }
  },
  setSession: async (token, refreshToken) => {
    const customerId = customerIdFromToken(token);
    if (!customerId) throw new Error('Invalid customer session. Please sign in again.');
    resetAccountData();
    const epoch = get().sessionEpoch + 1;
    pendingSignOut = true;
    // Do not expose a new identity before its single durable token record is
    // saved. A failed account switch must never restore the previous account.
    set({ customerId: null, accessToken: null, refreshToken: null, isHydrated: true, hydrationError: null, isGuest: false, sessionEpoch: epoch });
    try {
      await persistSession(token, refreshToken);
      if (get().sessionEpoch !== epoch) return;
      pendingSignOut = false;
      set({ customerId, accessToken: token, refreshToken });
    } catch (error) {
      if (get().sessionEpoch === epoch) set({ hydrationError: 'Couldn’t save your sign-in. Unlock your device and retry to clear the previous session, then sign in again.' });
      throw error;
    }
  },
  setTokens: async (token, refreshToken) => {
    if (!get().customerId || customerIdFromToken(token) !== get().customerId) throw new Error('Session changed.');
    set({ accessToken: token, refreshToken });
    await persistSession(token, refreshToken);
  },
  clear: async () => {
    pendingSignOut = true;
    resetAccountData();
    set({ customerId: null, accessToken: null, refreshToken: null, isHydrated: true, hydrationError: null, isGuest: false, sessionEpoch: get().sessionEpoch + 1 });
    try {
      await persistSession(null, null);
      pendingSignOut = false;
    } catch (error) {
      set({ hydrationError: 'Couldn’t finish signing out on this device. Unlock it and retry. Your account stays hidden until sign-out finishes.' });
      throw error;
    }
  },
  continueAsGuest: () => set({ isGuest: true }),
  exitGuestMode: () => set({ isGuest: false }),
}));

// Serialize secure storage writes so a late refresh cannot restore credentials
// on disk after logout, or overwrite a newer login.
let persistence: Promise<void> = Promise.resolve();
function persistSession(token: string | null, refresh: string | null): Promise<void> {
  const work = persistence.catch(() => {}).then(async () => {
    // One atomic secure value owns the pair. Logout writes a tombstone so
    // failure to remove obsolete legacy keys cannot resurrect the old account.
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ version: 2, accessToken: token, refreshToken: refresh }));
    } catch (error) {
      if (token || refresh) throw error;
      // Storage can permit deletion even when no space remains for a write.
      const removed = await Promise.allSettled([SESSION_KEY, TOKEN_KEY, REFRESH_TOKEN_KEY].map(key => SecureStore.deleteItemAsync(key)));
      if (removed.some(result => result.status === 'rejected')) throw error;
      return;
    }
    await Promise.allSettled([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
  });
  persistence = work;
  return work;
}
