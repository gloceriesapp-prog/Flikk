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
// Fixed demo code (DEMO_OTP_CODE) rather than "any code works" — typing a
// real, specific code exercises the actual verify-and-fail-on-wrong-code
// path, not just a rubber-stamp success.
//
// Session identity is threaded through the fake access token itself
// (`dev:<phone>`) since there's no real server to hold a session — every
// dev-fallback call that needs "which account is this" parses it back out
// of useAuthStore's current token rather than taking a phone param, same
// shape the real /auth/me endpoint has (identity from the auth header, not
// a request body).

import { useAuthStore } from '../store/useAuthStore';
import { ApiError } from './client';
import type { AccountStatus, StoreApplication, VerifyOtpResponse } from './auth';

export const DEMO_OTP_CODE = '123456';

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

function tokenFor(phone: string): string {
  return `dev:${phone}`;
}

function phoneFromCurrentToken(): string {
  const token = useAuthStore.getState().accessToken ?? '';
  return token.startsWith('dev:') ? token.slice(4) : '';
}

export async function devRequestOtp(phone: string): Promise<{ ok: true }> {
  if (!devAccounts.has(phone)) devAccounts.set(phone, { ...EMPTY_ACCOUNT });
  return { ok: true };
}

export async function devVerifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  if (code !== DEMO_OTP_CODE) {
    throw new ApiError(401, 'INVALID_OTP', `Incorrect code — dev mode uses ${DEMO_OTP_CODE}.`);
  }
  const account = devAccounts.get(phone) ?? { ...EMPTY_ACCOUNT };
  devAccounts.set(phone, account);
  return {
    access_token: tokenFor(phone),
    // No real expiry concept in dev mode — reusing the same fake token is
    // fine, refreshAccessToken (api/client.ts) never actually needs to
    // call a real /auth/refresh here since a dev session never 401s.
    refresh_token: tokenFor(phone),
    is_approved: account.isApproved,
    has_store: account.hasStore,
    application_submitted: account.applicationSubmitted,
    // Mirrors the real backend rule (auth.ts's own note): role only ever
    // flips to store_owner once a real store exists, same as the
    // simulated "admin approve" below does for hasStore.
    role: account.hasStore ? 'store_owner' : 'customer',
  };
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
export function isBackendUnreachable(err: unknown): boolean {
  return !(err instanceof ApiError);
}
