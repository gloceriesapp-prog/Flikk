// Session state. Token persisted in SecureStore, never AsyncStorage/
// plaintext — same rule apps/customer and apps/partner's own
// useAuthStore.ts follow (specs/00-foundation/auth-and-roles.md).
//
// role/isApproved/applicationSubmitted/isRejected/payoutConfigured are the
// flags RootNavigator's gate branches on. They're now PERSISTED (not just
// in-memory): on a cold start we restore the last-known status from
// SecureStore synchronously-ish during hydrate, so a rider who already
// submitted lands straight back on the "waiting for approval" screen the
// instant the app opens — even offline, and before the GET /auth/me
// refresh resolves. /auth/me still runs on every launch and overwrites
// this snapshot, so the persisted copy is only ever the immediate first
// paint, never the source of truth once the network answers.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// Exported so the headless background-location task (location/
// backgroundLocation.ts) reads the same keys — a relaunched task has an
// empty in-memory store, so it pulls the token straight from SecureStore.
export const ACCESS_TOKEN_KEY = 'gloceries_rider_access_token';
export const REFRESH_TOKEN_KEY = 'gloceries_rider_refresh_token';
const PHONE_KEY = 'gloceries_rider_phone';
// One JSON blob for the whole status snapshot — simpler than five keys,
// and it's written/read as a unit anyway.
const STATUS_KEY = 'gloceries_rider_account_status';

export type AccountRole = 'customer' | 'store_owner' | 'rider' | 'admin';

interface AccountStatusSnapshot {
  role: AccountRole | null;
  isApproved: boolean;
  applicationSubmitted: boolean;
  isRejected: boolean;
  payoutConfigured: boolean;
  rejectionReason: string | null;
  // Admin suspension (GET /auth/me rider_suspended). RootNavigator shows
  // RiderSuspendedScreen instead of the app shell while this is true.
  isSuspended: boolean;
  suspendedReason: string | null;
}

interface AuthState extends AccountStatusSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  phone: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, refreshToken: string, phone: string) => Promise<void>;
  // Refresh-only update (api/client.ts's own doRefresh) — phone doesn't
  // change on a token refresh, no reason to require/re-persist it.
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setAccountStatus: (status: AccountStatusSnapshot) => void;
  // ReviewSubmitScreen flips this the instant an application POST succeeds —
  // RootNavigator swaps to AccountStatusScreen without waiting for a /me
  // round trip, and the flag now survives an app close/reload.
  setApplicationSubmitted: (applicationSubmitted: boolean) => void;
  // BankDetailsScreen flips this on a successful payout verify.
  setPayoutConfigured: (payoutConfigured: boolean) => void;
  // PATCH /rider/status answered RIDER_SUSPENDED — flip to the suspended
  // screen without waiting for the next /auth/me.
  setSuspended: (suspendedReason: string | null) => void;
  clear: () => Promise<void>;
}

// Fire-and-forget write of the current status snapshot — never blocks a UI
// update, and a failed write just means the next launch falls back to the
// /auth/me refresh (which always runs anyway).
function persistStatus(s: AccountStatusSnapshot): void {
  void SecureStore.setItemAsync(
    STATUS_KEY,
    JSON.stringify({
      role: s.role,
      isApproved: s.isApproved,
      applicationSubmitted: s.applicationSubmitted,
      isRejected: s.isRejected,
      payoutConfigured: s.payoutConfigured,
      rejectionReason: s.rejectionReason,
      isSuspended: s.isSuspended,
      suspendedReason: s.suspendedReason,
    }),
  ).catch(() => {});
}

const EMPTY_STATUS: AccountStatusSnapshot = {
  role: null,
  isApproved: false,
  applicationSubmitted: false,
  isRejected: false,
  payoutConfigured: false,
  rejectionReason: null,
  isSuspended: false,
  suspendedReason: null,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  phone: null,
  ...EMPTY_STATUS,
  isHydrated: false,

  hydrate: async () => {
    // Bulletproof: isHydrated MUST end up true no matter what, or
    // RootNavigator's cold-start gate never lifts and the app hangs on the
    // splash. Each read is independent + tolerant so one failing key can't
    // block the rest, and any unexpected throw still falls through to the
    // final set().
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let phone: string | null = null;
    let status = EMPTY_STATUS;

    try {
      const [a, r, p, statusRaw] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null),
        SecureStore.getItemAsync(PHONE_KEY).catch(() => null),
        SecureStore.getItemAsync(STATUS_KEY).catch(() => null),
      ]);
      accessToken = a;
      refreshToken = r;
      phone = p;
      // Restore the last-known status so the correct gate (waiting / bank /
      // wizard / app) paints immediately on a cold start, before /auth/me.
      if (statusRaw) {
        try {
          status = { ...EMPTY_STATUS, ...(JSON.parse(statusRaw) as Partial<AccountStatusSnapshot>) };
        } catch {
          // Corrupt/legacy value — ignore, /auth/me repopulates it.
        }
      }
    } catch {
      // Never leave the app stuck on the splash because storage hiccuped.
    }

    set({ accessToken, refreshToken, phone, ...status, isHydrated: true });
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

  setAccountStatus: (status) => {
    const s = get();
    if (
      s.role !== status.role ||
      s.isApproved !== status.isApproved ||
      s.applicationSubmitted !== status.applicationSubmitted ||
      s.isRejected !== status.isRejected ||
      s.payoutConfigured !== status.payoutConfigured ||
      s.rejectionReason !== status.rejectionReason ||
      s.isSuspended !== status.isSuspended ||
      s.suspendedReason !== status.suspendedReason
    ) {
      set(status);
      persistStatus(status);
    }
  },

  setApplicationSubmitted: (applicationSubmitted) => {
    set({ applicationSubmitted });
    persistStatus({ ...currentStatus(get), applicationSubmitted });
  },

  setPayoutConfigured: (payoutConfigured) => {
    set({ payoutConfigured });
    persistStatus({ ...currentStatus(get), payoutConfigured });
  },

  setSuspended: (suspendedReason) => {
    set({ isSuspended: true, suspendedReason });
    persistStatus({ ...currentStatus(get), isSuspended: true, suspendedReason });
  },

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(PHONE_KEY),
      SecureStore.deleteItemAsync(STATUS_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, phone: null, ...EMPTY_STATUS });
  },
}));

// Reads just the status slice out of the current store state.
function currentStatus(get: () => AuthState): AccountStatusSnapshot {
  const s = get();
  return {
    role: s.role,
    isApproved: s.isApproved,
    applicationSubmitted: s.applicationSubmitted,
    isRejected: s.isRejected,
    payoutConfigured: s.payoutConfigured,
    rejectionReason: s.rejectionReason,
    isSuspended: s.isSuspended,
    suspendedReason: s.suspendedReason,
  };
}
