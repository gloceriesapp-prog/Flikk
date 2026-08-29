// Session + approval state. Token persisted in SecureStore, never
// AsyncStorage/plaintext — specs/00-foundation/auth-and-roles.md:
// "Session tokens stored via SecureStore (mobile) ... not plaintext local
// storage." Same shape as apps/customer/src/store/useAuthStore.ts, plus
// what this app needs that customer doesn't: `isApproved`, `hasStore`, and
// `applicationSubmitted` — a store owner's session existing isn't enough
// to unlock the app, per auth-and-roles.md's "Approval gating" section.
//
// applicationSubmitted exists because a real `stores` row (hasStore) only
// gets created at approval time now (backend's storeOnboarding.ts's own
// note — an explicit ask that unapproved data never lands in the main
// `stores` table) — so hasStore alone can't tell "never finished the
// wizard" apart from "submitted, waiting on a founder's decision"
// anymore. RootNavigator reads all four to decide Auth stack (still
// filling the wizard) vs. Waiting screen (submitted, pending) vs. the
// real app shell (approved).
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'flikk_partner_access_token';

interface AuthState {
  accessToken: string | null;
  isApproved: boolean;
  hasStore: boolean;
  applicationSubmitted: boolean;
  isHydrated: boolean; // true once we've checked SecureStore on cold start
  hydrate: () => Promise<void>;
  setSession: (token: string, isApproved: boolean, hasStore: boolean, applicationSubmitted: boolean) => Promise<void>;
  setApproved: (isApproved: boolean) => void;
  setHasStore: (hasStore: boolean) => void;
  setApplicationSubmitted: (applicationSubmitted: boolean) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isApproved: false,
  hasStore: false,
  applicationSubmitted: false,
  isHydrated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    // Approval/store status aren't persisted alongside the token — a
    // returning session re-checks both via checkApprovalStatus() rather
    // than trusting a stale local flag that could be wrong by the time
    // the app is reopened (e.g. approved since the last session).
    set({ accessToken: token, isHydrated: true });
  },

  setSession: async (token, isApproved, hasStore, applicationSubmitted) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ accessToken: token, isApproved, hasStore, applicationSubmitted });
  },

  setApproved: (isApproved) => set({ isApproved }),
  setHasStore: (hasStore) => set({ hasStore }),
  setApplicationSubmitted: (applicationSubmitted) => set({ applicationSubmitted }),

  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ accessToken: null, isApproved: false, hasStore: false, applicationSubmitted: false });
  },
}));
