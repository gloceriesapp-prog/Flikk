// The one real fetch-wrapper implementation for talking to Gloceries's backend
// auth endpoints — every app (customer, partner, rider) was carrying its
// own hand-copied version of this exact same request/error logic
// (specs/00-foundation/api-conventions.md), which is precisely the
// "duplicated across at least two apps" bar this package's own note says
// justifies pulling something in here instead of leaving it copied.
//
// Framework-agnostic on purpose — no React Native import, no Zustand
// import. Each app supplies its own `getAccessToken` (reading whatever
// session store that app already has) via createApiClient(), so this
// module has zero opinion on how a session is stored, only on how a
// request is shaped and how a failure is reported. That's what makes it
// safe to share across apps whose auth stores are otherwise independent.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean; // attach the caller-supplied access token — default true
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => string | null;
  // Optional — an app that wants "a 401 doesn't mean log out" (this
  // module's own note, see backend's POST /auth/refresh) supplies this:
  // exchange whatever refresh token it holds for a new access token,
  // persist both, and return the new access token (or null if refreshing
  // itself failed — an actually-dead session, not a transient expiry).
  // Deliberately a plain caller-supplied function, not a call back into
  // apiRequest itself — an app's own refresh call almost always needs
  // fields (a refresh token) this client has no opinion on, and routing it
  // through apiRequest here would recurse the moment that call also 401s.
  refresh?: () => Promise<string | null>;
  // Optional — fired once when a request that ACTUALLY carried an access
  // token 401s and refresh() couldn't recover it (no refresh configured,
  // or refresh returned null). This is a genuinely dead session: the app
  // supplies e.g. `() => useAuthStore.getState().clear()` so RootNavigator
  // bounces back to login instead of the shell staying up while every
  // future call 401s forever. Guarded on "had a token" on purpose — a
  // GUEST (no token) hitting a stray auth-required call must NOT trip this,
  // or clearing would bounce them to login for a failed optional fetch
  // (customer app's own guest mode — apps/customer's client note).
  onSessionExpired?: () => void | Promise<void>;
}

export interface ApiClient {
  apiRequest: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

export function createApiClient({ baseUrl, getAccessToken, refresh, onSessionExpired }: ApiClientConfig): ApiClient {
  async function send(path: string, method: string, body: unknown, token: string | null, signal?: AbortSignal) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    // fetch() throws a raw, unlogged TypeError on network failure (host
    // unreachable, DNS, timeout) — wrap it so callers get one consistent
    // ApiError type instead of every screen needing its own fallback for
    // "not actually a server error", and log it so a misconfigured base URL
    // is diagnosable instead of silently swallowed. (Previously each app
    // hand-rolled this around its own send calls.)
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 20000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method, headers, signal: controller.signal,
        body: body ? JSON.stringify(body) : undefined,
      });
      let json: unknown;
      try { json = await res.json(); }
      catch (error) {
        if (controller.signal.aborted) throw error;
        if (res.ok) throw new ApiError(0, 'INVALID_RESPONSE', 'Could not read the server response. Check your pending checkout before retrying.');
        json = null;
      }
      return { res, json: json as { error?: { code?: string; message?: string } } | null };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, signal?.aborted ? 'REQUEST_CANCELLED' : controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        'Could not reach the server. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }

  async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;

    // Captured before the request so the dead-session guard below fires only
    // when a real token was actually sent (guest guard — see onSessionExpired).
    const token = auth ? getAccessToken() : null;
    let { res, json } = await send(path, method, body, token, options.signal);

    // A real 401 doesn't automatically mean "log this person out" anymore
    // — it might just mean the access token expired (they're short-lived,
    // see backend's own note on POST /otp/verify). One silent
    // refresh-and-retry before surfacing the error at all — only the
    // caller's own eventual 401 (refresh also failed) reads as a genuinely
    // dead session worth logging out over.
    if (res.status === 401 && auth) {
      const newToken = refresh ? await refresh() : null;
      if (newToken) {
        ({ res, json } = await send(path, method, body, newToken, options.signal));
      } else if (res.status === 401 && token && onSessionExpired) {
        // Refresh genuinely couldn't recover a session that HAD a token —
        // hand it back to the app to clear so RootNavigator bounces to login
        // instead of the shell staying up while every future call 401s.
        await onSessionExpired();
      }
    }

    if (!res.ok) {
      const code = json?.error?.code ?? 'UNKNOWN_ERROR';
      const message = json?.error?.message ?? 'Something went wrong. Please try again.';
      throw new ApiError(res.status, code, message);
    }

    return json as T;
  }

  return { apiRequest };
}
