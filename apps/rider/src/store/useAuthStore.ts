// Session state. Token persisted in SecureStore, never AsyncStorage/
// plaintext — same rule apps/customer and apps/partner's own
// useAuthStore.ts follow (specs/00-foundation/auth-and-roles.md). No
// isApproved/hasStore concept here — a rider account doesn't have an
// onboarding-approval gate in this build (api/auth.ts's own note on why),
// so a session existing is enough to unlock the app.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'flikk_rider_access_token';
const PHONE_KEY = 'flikk_rider_phone';

interface AuthState {
  accessToken: string | null;
  phone: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, phone: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  phone: null,
  isHydrated: false,

  hydrate: async () => {
    const [token, phone] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(PHONE_KEY)]);
    set({ accessToken: token, phone, isHydrated: true });
  },

  setSession: async (token, phone) => {
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(PHONE_KEY, phone)]);
    set({ accessToken: token, phone });
  },

  clear: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(PHONE_KEY)]);
    set({ accessToken: null, phone: null });
  },
}));
