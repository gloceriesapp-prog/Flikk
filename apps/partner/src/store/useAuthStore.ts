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
//
// refreshToken persists alongside accessToken now — an explicit fix for
// "the app logs me out on its own": access tokens are short-lived (1hr,
// see backend's own note on POST /otp/verify), and with no refresh token
// ever stored, every session that outlived one hour hit a real 401 on its
// next request and RootNavigator's own "a 401 means log out" effect
// treated that as an actual logout, not an expired-but-recoverable
// session. api/client.ts's `refresh` callback (wired into @gloceries/shared's
// createApiClient) uses setTokens below to keep both current, silently,
// before a 401 ever reaches RootNavigator at all. The only way to actually
// log out now is Settings' own Log out row (StoreSettingsScreen) calling
// clear() directly, or a refresh token that's itself expired/revoked
// (genuinely dead, nothing left to silently recover).
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const TOKEN_KEY = 'gloceries_partner_access_token';
const REFRESH_TOKEN_KEY = 'gloceries_partner_refresh_token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isApproved: boolean;
  hasStore: boolean;
  applicationSubmitted: boolean;
  // Only ever true for a still-current rejection — see backend's GET
  // /auth/me own note on why a resubmission clears this server-side.
  isRejected: boolean;
  rejectionReason: string | null;
  // Admin partner-account suspension (GET /auth/me partner_suspended, or a
  // 403 PARTNER_SUSPENDED from any partner route) — RootNavigator shows
  // PartnerSuspendedScreen instead of the app shell while set.
  partnerSuspended: boolean;
  partnerSuspendedReason: string | null;
  isHydrated: boolean; // true once we've checked SecureStore on cold start
  hydrate: () => Promise<void>;
  setSession: (
    token: string,
    refreshToken: string,
    isApproved: boolean,
    hasStore: boolean,
    applicationSubmitted: boolean
  ) => Promise<void>;
  // Called only by api/client.ts's `refresh` callback after a successful
  // silent token refresh — updates both the store and SecureStore without
  // touching isApproved/hasStore/applicationSubmitted, which have nothing
  // to do with a token rotation.
  setTokens: (token: string, refreshToken: string) => Promise<void>;
  setApproved: (isApproved: boolean) => void;
  setHasStore: (hasStore: boolean) => void;
  setApplicationSubmitted: (applicationSubmitted: boolean) => void;
  setRejection: (isRejected: boolean, rejectionReason: string | null) => void;
  setPartnerSuspension: (suspended: boolean, reason: string | null) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isApproved: false,
  hasStore: false,
  applicationSubmitted: false,
  isRejected: false,
  rejectionReason: null,
  partnerSuspended: false,
  partnerSuspendedReason: null,
  isHydrated: false,

  hydrate: async () => {
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    // Remove sessions issued by the retired local demo flow, even offline.
    // Real sessions remain available while the backend is temporarily unreachable.
    if (token?.startsWith('dev:') || refreshToken?.startsWith('dev:')) {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      set({ accessToken: null, refreshToken: null, isHydrated: true });
      return;
    }
    // Approval/store status aren't persisted alongside the token — a
    // returning session re-checks both via checkApprovalStatus() rather
    // than trusting a stale local flag that could be wrong by the time
    // the app is reopened (e.g. approved since the last session).
    set({ accessToken: token, refreshToken, isHydrated: true });
  },

  setSession: async (token, refreshToken, isApproved, hasStore, applicationSubmitted) => {
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)]);
    set({ accessToken: token, refreshToken, isApproved, hasStore, applicationSubmitted });
  },

  setTokens: async (token, refreshToken) => {
    await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, token), SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)]);
    set({ accessToken: token, refreshToken });
  },

  setApproved: (isApproved) => set({ isApproved }),
  setHasStore: (hasStore) => set({ hasStore }),
  setApplicationSubmitted: (applicationSubmitted) => set({ applicationSubmitted }),
  setRejection: (isRejected, rejectionReason) => set({ isRejected, rejectionReason }),
  setPartnerSuspension: (partnerSuspended, partnerSuspendedReason) => set({ partnerSuspended, partnerSuspendedReason }),

  clear: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
    set({
      accessToken: null,
      refreshToken: null,
      isApproved: false,
      hasStore: false,
      applicationSubmitted: false,
      isRejected: false,
      rejectionReason: null,
      partnerSuspended: false,
      partnerSuspendedReason: null,
    });
  },
}));
