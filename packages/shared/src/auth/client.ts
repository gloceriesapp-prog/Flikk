// The one real fetch-wrapper implementation for talking to Flikk's backend
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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
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
}

export interface ApiClient {
  apiRequest: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

export function createApiClient({ baseUrl, getAccessToken, refresh }: ApiClientConfig): ApiClient {
  async function send(path: string, method: string, body: unknown, token: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { res, json };
  }

  async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;

    let { res, json } = await send(path, method, body, auth ? getAccessToken() : null);

    // A real 401 doesn't automatically mean "log this person out" anymore
    // — it might just mean the access token expired (they're short-lived,
    // see backend's own note on POST /otp/verify). One silent
    // refresh-and-retry before surfacing the error at all — only the
    // caller's own eventual 401 (refresh also failed) reads as a genuinely
    // dead session worth logging out over.
    if (res.status === 401 && auth && refresh) {
      const newToken = await refresh();
      if (newToken) {
        ({ res, json } = await send(path, method, body, newToken));
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
