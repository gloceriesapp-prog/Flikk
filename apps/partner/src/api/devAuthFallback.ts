// Local stand-in for the real /auth/otp/* + /partner/store-application +
// /auth/me endpoints — engages automatically (see auth.ts's own note on
// where) only when the real backend is genuinely unreachable, the same
// "no real endpoint yet" situation every other screen in this app has been
// built against from day one (PLACEHOLDER_ORDERS, PLACEHOLDER_PRODUCTS,
// etc.). This is what "OTP not receiving" actually was: no backend, no SMS
// provider configured anywhere in this sandbox — not a bug in the request
// code, which was already correct. The fallback isn't a redesign of the
// auth flow, it's the same flow with a fake clock and a fixed code instead
// of a real SMS gateway, so swapping it out later is deleting this file,
// not rewriting anything that calls it.
//
// Login (OTP request/verify) no longer falls back here: a fake code hid
// real problems behind "invalid code" (see auth.ts). What remains only
// covers a dev session that already exists.
//
// Session identity is threaded through the fake access token itself
// (`dev:<phone>`) since there's no real server to hold a session — every
// dev-fallback call that needs "which account is this" parses it back out
// of useAuthStore's current token rather than taking a phone param, same
// shape the real /auth/me endpoint has (identity from the auth header, not
// a request body).

import { useAuthStore } from '../store/useAuthStore';
import { ApiError } from './client';
import type { AccountStatus, StoreApplication } from './auth';

// How long after submitting a store application the dev fallback
// "approves" it on its own — long enough to see the Waiting screen for
// real, short enough not to make testing the happy path tedious. Stands
// in for an admin actually clicking approve in A1.
const AUTO_APPROVE_DELAY_MS = 20_000;

interface DevAccount {
  hasStore: boolean;
  isApproved: boolean;
  applicationSubmitted: boolean;
}

const EMPTY_ACCOUNT: DevAccount = { hasStore: false, isApproved: false, applicationSubmitted: false };

const devAccounts = new Map<string, DevAccount>();

function phoneFromCurrentToken(): string {
  const token = useAuthStore.getState().accessToken ?? '';
  return token.startsWith('dev:') ? token.slice(4) : '';
}


// Mirrors the real model now (storeOnboarding.ts's own note): submitting
// only marks the application as submitted/pending — hasStore doesn't flip
// until the simulated "admin approve" below, same as a real founder
// clicking Approve creates the real `stores` row that flips it for real.
export async function devSubmitStoreApplication(_application: StoreApplication): Promise<{ ok: true }> {
  const phone = phoneFromCurrentToken();
  const account = devAccounts.get(phone) ?? { ...EMPTY_ACCOUNT };
  account.applicationSubmitted = true;
  devAccounts.set(phone, account);

  setTimeout(() => {
    const current = devAccounts.get(phone);
    if (current) devAccounts.set(phone, { ...current, isApproved: true, hasStore: true });
  }, AUTO_APPROVE_DELAY_MS);

  return { ok: true };
}

export async function devCheckAccountStatus(): Promise<AccountStatus> {
  const phone = phoneFromCurrentToken();
  const account = devAccounts.get(phone) ?? { ...EMPTY_ACCOUNT };
  return { is_approved: account.isApproved, has_store: account.hasStore, application_submitted: account.applicationSubmitted };
}

// Only a genuine network failure (backend unreachable — connection
// refused, DNS failure, offline) should trigger the fallback. A real
// server that responded with a real error (bad OTP, validation failure)
// must still surface as a real ApiError, not get silently swallowed into
// dev mode — that distinction is what `apiRequest` already encodes: it
// only ever throws a plain (non-ApiError) exception when `fetch()` itself
// rejected, never for an HTTP response it successfully received.
//
// Development builds only. A production build must never sign an owner into a
// local fake session or report an application as submitted when it never
// reached the server — a real failure surfaces as the real error instead.
// The shared client reports a failed fetch as ApiError status 0, so that is
// what "unreachable" means here.
export function isBackendUnreachable(err: unknown): boolean {
  if (!__DEV__) return false;
  return !(err instanceof ApiError) || err.status === 0;
}
