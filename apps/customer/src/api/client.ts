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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // fetch() throws a raw, unlogged TypeError on network failure (host
    // unreachable, DNS, timeout) — wrap it so callers get one consistent
    // ApiError type instead of every screen needing its own fallback for
    // "not actually a server error", and log it so a misconfigured
    // EXPO_PUBLIC_API_URL is diagnosable instead of silently swallowed.
    console.error(`[apiRequest] network error calling ${path}:`, err);
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your internet connection and try again.');
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const code = json?.error?.code ?? 'UNKNOWN_ERROR';
    const message = json?.error?.message ?? 'Something went wrong. Please try again.';
    throw new ApiError(res.status, code, message);
  }

  return json as T;
}
