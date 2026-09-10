// Thin fetch wrapper for the Flikk backend (specs/00-foundation/api-conventions.md).
// Attaches the session token when present; never handles routing/auth-state,
// that's the caller's/store's job. Same shape as apps/customer and
// apps/partner's own client.ts, on purpose — a bug fixed once in the
// shared pattern should be checkable across all three, not rediscovered
// independently in each (CLAUDE.md's own consistency rule).

import { useAuthStore } from '../store/useAuthStore';

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
// refresh call also came back 401. See apps/customer's own client.ts note
// on why a refresh-token dance exists at all (Supabase access tokens are
// short-lived).
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
    return null;
  }
}

// Supabase refresh tokens are single-use — see apps/customer/src/api/
// client.ts's own note on the exact race this in-flight promise prevents
// (multiple concurrent 401s each trying to redeem the same token).
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
    console.error(`[apiRequest] network error calling ${path}:`, err);
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your internet connection and try again.');
  }

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
      // Refresh genuinely couldn't recover this session — clearing here is
      // what makes RootNavigator naturally bounce back to AuthNavigator
      // instead of the app shell staying up while every call 403s forever.
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
