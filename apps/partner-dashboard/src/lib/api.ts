// Thin fetch wrapper for the real Gloceries backend — same /partner/* API the
// mobile partner app already uses (backend/src/routes/partner.ts), same
// bearer-token auth (backend/src/routes/auth.ts's phone OTP), just called
// from a browser instead of React Native. Refresh-on-401 mirrors
// apps/partner's own api/client.ts note almost verbatim: Supabase access
// tokens are short-lived (1hr), and without a silent refresh here every
// session would look "logged out" the moment that hour passed.

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
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

// One shared in-flight refresh promise — a burst of concurrent 401s (e.g.
// Overview firing 3 requests at once right as the token expires) all
// await the SAME refresh instead of each redeeming the single-use
// refresh token separately, which would make every request after the
// first fail with an already-consumed token. Same race apps/partner's own
// client.ts fixed for the mobile app.
let inFlightRefresh: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const { access_token, refresh_token } = (await res.json()) as { access_token: string; refresh_token: string };
    setTokens(access_token, refresh_token);
    return access_token;
  } catch {
    return null;
  }
}

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
    ({ res, json } = await send(path, method, body, auth ? getAccessToken() : null));
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        ({ res, json } = await send(path, method, body, newToken));
      } catch {
        throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
      }
    } else {
      clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    // Backend's errorHandler (backend/src/middleware/errorHandler.ts) sends
    // { error: { code, message } } — same shape @gloceries/shared's client
    // parses for the mobile apps. This used to read the old flat
    // { error: string, code: string } shape, which meant every real error
    // here rendered as the literal string "[object Object]" instead of the
    // actual message.
    const body = json as { error?: { code?: string; message?: string } } | null;
    const message = body?.error?.message ?? `Request failed (${res.status}).`;
    const code = body?.error?.code ?? 'REQUEST_FAILED';
    throw new ApiError(res.status, code, message);
  }

  return json as T;
}
