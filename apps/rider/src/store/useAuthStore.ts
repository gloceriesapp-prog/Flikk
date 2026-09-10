// Session state. Token persisted in SecureStore, never AsyncStorage/
// plaintext — same rule apps/customer and apps/partner's own
// useAuthStore.ts follow (specs/00-foundation/auth-and-roles.md).
//
// role/isApproved ride along here (not re-fetched by every screen that
// needs them) because RootNavigator's own gate depends on both: a phone
// number that verifies OTP successfully but was never manually upgraded to
// role='rider' (there is no self-serve "become a rider" flow yet — see
// api/auth.ts's own note) still needs a real, honest screen instead of
// silently 403ing on every backend/src/routes/rider.ts call forever.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ACCESS_TOKEN_KEY = 'flikk_rider_access_token';
const REFRESH_TOKEN_KEY = 'flikk_rider_refresh_token';
const PHONE_KEY = 'flikk_rider_phone';

export type AccountRole = 'customer' | 'store_owner' | 'rider' | 'admin';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  phone: string | null;
  role: AccountRole | null;
  isApproved: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, phone: string) => Promise<void>;
  // Refresh-only update (api/client.ts's own doRefresh) — phone doesn't
  // change on a token refresh, no reason to require/re-persist it.
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setAccountStatus: (role: AccountRole, isApproved: boolean) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  phone: null,
  role: null,
  isApproved: false,
  isHydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken, phone] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(PHONE_KEY),
    ]);
    set({ accessToken, refreshToken, phone, isHydrated: true });
  },

  setSession: async (accessToken, refreshToken, phone) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      SecureStore.setItemAsync(PHONE_KEY, phone),
    ]);
    set({ accessToken, refreshToken, phone });
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  setAccountStatus: (role, isApproved) => {
    if (get().role !== role || get().isApproved !== isApproved) set({ role, isApproved });
  },

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(PHONE_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, phone: null, role: null, isApproved: false });
  },
}));
