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
}

export interface ApiClient {
  apiRequest: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

export function createApiClient({ baseUrl, getAccessToken }: ApiClientConfig): ApiClient {
  async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const code = json?.error?.code ?? 'UNKNOWN_ERROR';
      const message = json?.error?.message ?? 'Something went wrong. Please try again.';
      throw new ApiError(res.status, code, message);
    }

    return json as T;
  }

  return { apiRequest };
}
