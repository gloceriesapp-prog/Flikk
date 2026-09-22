// Session state. Token persisted in SecureStore, never AsyncStorage/
// plaintext — same rule apps/customer and apps/partner's own
// useAuthStore.ts follow (specs/00-foundation/auth-and-roles.md).
//
// role/isApproved/applicationSubmitted ride along here (not re-fetched by
// every screen that needs them) because RootNavigator's own gate depends
// on all three: role only ever flips to 'rider' at admin approval
// (migrations/042_rider_onboarding.sql's own note), so a session with
// role==='customer' and applicationSubmitted===false is a brand-new
// applicant who needs the real onboarding wizard, not the waiting screen.

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
  // In-memory only, same "not worth persisting across app restarts" call
  // as apps/partner's own useAuthStore.ts — RootNavigator re-derives this
  // from a fresh GET /auth/me on every cold start's own status check
  // anyway, so persisting it would only ever risk it going stale.
  applicationSubmitted: boolean;
  // A submitted application the founder sent back for changes — routes to
  // the wizard (to resubmit) rather than the "under review" waiting screen,
  // even though applicationSubmitted is still true.
  isRejected: boolean;
  // Approved rider with bank details on file — the difference between
  // "straight to Home" and "show the post-approval BankDetailsScreen"
  // (RootNavigator's own gate). Same in-memory-only reasoning as above.
  payoutConfigured: boolean;
  // A current rejection's own reason, shown on OnboardingIntroScreen so a
  // rejected applicant resubmitting sees why. Null unless is_rejected.
  rejectionReason: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, phone: string) => Promise<void>;
  // Refresh-only update (api/client.ts's own doRefresh) — phone doesn't
  // change on a token refresh, no reason to require/re-persist it.
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setAccountStatus: (status: {
    role: AccountRole;
    isApproved: boolean;
    applicationSubmitted: boolean;
    isRejected: boolean;
    payoutConfigured: boolean;
    rejectionReason: string | null;
  }) => void;
  // ReviewSubmitScreen flips this the instant an application POST succeeds —
  // RootNavigator swaps to AccountStatusScreen without waiting for a /me
  // round trip, same as apps/partner's own review step.
  setApplicationSubmitted: (applicationSubmitted: boolean) => void;
  // BankDetailsScreen flips this on a successful payout verify — swaps
  // RootNavigator from the bank step straight to the real app shell.
  setPayoutConfigured: (payoutConfigured: boolean) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  phone: null,
  role: null,
  isApproved: false,
  applicationSubmitted: false,
  isRejected: false,
  payoutConfigured: false,
  rejectionReason: null,
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

  setAccountStatus: ({ role, isApproved, applicationSubmitted, isRejected, payoutConfigured, rejectionReason }) => {
    const s = get();
    if (
      s.role !== role ||
      s.isApproved !== isApproved ||
      s.applicationSubmitted !== applicationSubmitted ||
      s.isRejected !== isRejected ||
      s.payoutConfigured !== payoutConfigured ||
      s.rejectionReason !== rejectionReason
    ) {
      set({ role, isApproved, applicationSubmitted, isRejected, payoutConfigured, rejectionReason });
    }
  },

  setApplicationSubmitted: (applicationSubmitted) => set({ applicationSubmitted }),

  setPayoutConfigured: (payoutConfigured) => set({ payoutConfigured }),

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(PHONE_KEY),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      phone: null,
      role: null,
      isApproved: false,
      applicationSubmitted: false,
      isRejected: false,
      payoutConfigured: false,
      rejectionReason: null,
    });
  },
}));
