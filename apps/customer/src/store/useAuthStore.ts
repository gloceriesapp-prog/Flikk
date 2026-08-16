// Session state. Token persisted in SecureStore, never AsyncStorage/plaintext —
// see specs/00-foundation/auth-and-roles.md: "Session tokens stored via SecureStore
// (mobile) ... not plaintext local storage."

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'flikk_customer_access_token';

interface AuthState {
  accessToken: string | null;
  isHydrated: boolean; // true once we've checked SecureStore on cold start
  hydrate: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isHydrated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ accessToken: token, isHydrated: true });
  },

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ accessToken: token });
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ accessToken: null });
  },
}));
