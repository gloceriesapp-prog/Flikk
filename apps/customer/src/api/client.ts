// Thin fetch wrapper for the Flikk backend (specs/00-foundation/api-conventions.md).
// Attaches the session token when present; never handles routing/auth-state,
// that's the caller's/store's job.

import { useAuthStore } from '../store/useAuthStore';

// Fallback only matters when EXPO_PUBLIC_API_URL is unset (shouldn't
// happen — .env.local always sets it) — backend/Express listens on 4000,
// not 3000 (that's apps/admin's Next.js dev server). A wrong fallback here
// would silently point every request at the wrong server instead of
// failing loudly.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // attach the stored session token — default true
}

async function send(path: string, method: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

// Plain fetch, not apiRequest — apiRequest is what calls this on a 401;
// routing this through apiRequest itself would recurse the moment the
// refresh call also came back 401. Not api/auth.ts's own refreshSession
// either, to avoid a circular import (auth.ts imports apiRequest from this
// file). See useAuthStore.ts's own note on why this exists at all — no
// refresh token ever meant every session died the moment its 1hr access
// token expired, surfacing as "Invalid or expired session" on whatever
// screen happened to make the next authenticated call (checkout, most
// visibly — items can sit in the cart a while before Pay now).
async function doRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const { access_token, refresh_token } = (await res.json()) as { access_token: string; refresh_token: string };
    await useAuthStore.getState().setTokens(access_token, refresh_token);
    return access_token;
  } catch {
    // Network blip mid-refresh — surfaces as the original 401 to the
    // caller, same as a genuine refresh failure. Not retried here; the
    // next real request tries again on its own.
    return null;
  }
}

// Supabase refresh tokens are single-use — redeeming one issues a new one
// and invalidates the old. Multiple authenticated calls firing close
// together on an expired access token (e.g. checkout's own order-create
// immediately followed by the Razorpay-order-create call) can each
// independently try to redeem the SAME stored refresh token in parallel;
// only the first succeeds, the rest would reuse an already-consumed token
// and get rejected. One shared in-flight promise makes every concurrent
// 401 await and reuse the same real refresh instead of racing separate
// ones (this exact race was a real bug on the partner app — see
// apps/partner/src/api/client.ts's own note).
let inFlightRefresh: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  let res: Response;
  let json: unknown;
  try {
    ({ res, json } = await send(path, method, body, auth ? useAuthStore.getState().accessToken : null));
  } catch (err) {
    // fetch() throws a raw, unlogged TypeError on network failure (host
    // unreachable, DNS, timeout) — wrap it so callers get one consistent
    // ApiError type instead of every screen needing its own fallback for
    // "not actually a server error", and log it so a misconfigured
    // EXPO_PUBLIC_API_URL is diagnosable instead of silently swallowed.
    console.error(`[apiRequest] network error calling ${path}:`, err);
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your internet connection and try again.');
  }

  // A real 401 doesn't automatically mean "session is dead" anymore — it
  // might just mean the access token expired (short-lived, see backend's
  // own note on POST /otp/verify). One silent refresh-and-retry before
  // surfacing the error at all.
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        ({ res, json } = await send(path, method, body, newToken));
      } catch (err) {
        console.error(`[apiRequest] network error retrying ${path}:`, err);
        throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your internet connection and try again.');
      }
    } else if (res.status === 401) {
      // Refresh genuinely couldn't recover this session — no refresh
      // token stored at all (a session created before this fix existed,
      // or one that's outlived its refresh token too) or the backend
      // rejected it outright. Left uncleared, accessToken stays truthy
      // forever: RootNavigator keeps showing the app shell and every
      // future authenticated call fails with this exact same "Invalid or
      // expired session" error, with no way back to login short of
      // manually clearing app storage. Clearing here is what makes
      // RootNavigator naturally bounce to AuthNavigator instead.
      await useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    const errorBody = json as { error?: { code?: string; message?: string } } | null;
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR';
    const message = errorBody?.error?.message ?? 'Something went wrong. Please try again.';
    throw new ApiError(res.status, code, message);
  }

  return json as T;
}
