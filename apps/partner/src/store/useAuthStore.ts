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
import { getSessionEpoch, isCurrentSession, resetSessionScope } from './sessionScope';

const TOKEN_KEY = 'gloceries_partner_access_token';
const REFRESH_TOKEN_KEY = 'gloceries_partner_refresh_token';

interface AuthState {
  sessionEpoch: number;
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
  setTokens: (token: string, refreshToken: string, expectedEpoch?: number) => Promise<void>;
  setApproved: (isApproved: boolean) => void;
  setHasStore: (hasStore: boolean) => void;
  setApplicationSubmitted: (applicationSubmitted: boolean) => void;
  setRejection: (isRejected: boolean, rejectionReason: string | null) => void;
  setPartnerSuspension: (suspended: boolean, reason: string | null) => void;
  clear: () => Promise<void>;
}

// Serialize SecureStore writes so a delayed old save cannot restore a token
// after logout. State changes happen synchronously before storage is awaited.
let persistence: Promise<void> = Promise.resolve();
function persistSession(token: string | null, refreshToken: string | null): Promise<void> {
  const operation = persistence.catch(() => {}).then(async () => {
    if (token && refreshToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  });
  persistence = operation;
  return operation;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  sessionEpoch: getSessionEpoch(),
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
    // Navigator remounts also happen at sign-in/account changes. Hydration
    // is a cold-start operation; persisted tokens may still be catching up
    // with the authoritative in-memory session at those later mounts.
    if (get().isHydrated) return;
    const epoch = getSessionEpoch();
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    // Approval/store status aren't persisted alongside the token — a
    // returning session re-checks both via checkApprovalStatus() rather
    // than trusting a stale local flag that could be wrong by the time
    // the app is reopened (e.g. approved since the last session).
    if (isCurrentSession(epoch) && !get().isHydrated) {
      set({ accessToken: token, refreshToken, isHydrated: true });
    }
  },

  setSession: async (token, refreshToken, isApproved, hasStore, applicationSubmitted) => {
    const sessionEpoch = resetSessionScope();
    set({ sessionEpoch, isHydrated: true, accessToken: token, refreshToken, isApproved, hasStore, applicationSubmitted,
      isRejected: false, rejectionReason: null, partnerSuspended: false, partnerSuspendedReason: null });
    await persistSession(token, refreshToken);
  },

  setTokens: async (token, refreshToken, expectedEpoch = getSessionEpoch()) => {
    if (!isCurrentSession(expectedEpoch)) return;
    set({ accessToken: token, refreshToken });
    await persistSession(token, refreshToken);
  },

  setApproved: (isApproved) => set({ isApproved }),
  setHasStore: (hasStore) => set({ hasStore }),
  setApplicationSubmitted: (applicationSubmitted) => set({ applicationSubmitted }),
  setRejection: (isRejected, rejectionReason) => set({ isRejected, rejectionReason }),
  setPartnerSuspension: (partnerSuspended, partnerSuspendedReason) => set({ partnerSuspended, partnerSuspendedReason }),

  clear: async () => {
    const sessionEpoch = resetSessionScope();
    set({
      sessionEpoch,
      isHydrated: true,
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
    await persistSession(null, null);
  },
}));
