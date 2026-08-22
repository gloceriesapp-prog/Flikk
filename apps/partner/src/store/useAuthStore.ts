// Session + approval state. Token persisted in SecureStore, never
// AsyncStorage/plaintext — specs/00-foundation/auth-and-roles.md:
// "Session tokens stored via SecureStore (mobile) ... not plaintext local
// storage." Same shape as apps/customer/src/store/useAuthStore.ts, plus
// the one thing this app needs that customer doesn't: `isApproved` and
// `hasStore` — a store owner's session existing isn't enough to unlock the
// app, per auth-and-roles.md's "Approval gating" section. RootNavigator
// reads all three to decide Auth stack vs. Waiting screen vs. the real
// app shell.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'flikk_partner_access_token';

interface AuthState {
  accessToken: string | null;
  isApproved: boolean;
  hasStore: boolean;
  isHydrated: boolean; // true once we've checked SecureStore on cold start
  hydrate: () => Promise<void>;
  setSession: (token: string, isApproved: boolean, hasStore: boolean) => Promise<void>;
  setApproved: (isApproved: boolean) => void;
  setHasStore: (hasStore: boolean) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isApproved: false,
  hasStore: false,
  isHydrated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    // Approval/store status aren't persisted alongside the token — a
    // returning session re-checks both via checkApprovalStatus() rather
    // than trusting a stale local flag that could be wrong by the time
    // the app is reopened (e.g. approved since the last session).
    set({ accessToken: token, isHydrated: true });
  },

  setSession: async (token, isApproved, hasStore) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ accessToken: token, isApproved, hasStore });
  },

  setApproved: (isApproved) => set({ isApproved }),
  setHasStore: (hasStore) => set({ hasStore }),

  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ accessToken: null, isApproved: false, hasStore: false });
  },
}));
