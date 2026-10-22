import { ApiError } from '@gloceries/shared';

interface SessionTokens { access_token: string; refresh_token: string }

// Only an explicit authentication rejection invalidates the saved session.
// An outage during token rotation must remain retryable without signing out.
export async function requestSessionRefresh(
  apiUrl: string,
  refreshToken: string,
  timeoutMs = 20_000,
): Promise<SessionTokens | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }), signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new ApiError(res.status, 'REFRESH_UNAVAILABLE', 'Could not restore your connection. Please try again.');
    const body: unknown = await res.json();
    if (!body || typeof body !== 'object' || !('access_token' in body) || !('refresh_token' in body)
      || typeof body.access_token !== 'string' || !body.access_token
      || typeof body.refresh_token !== 'string' || !body.refresh_token) {
      throw new ApiError(0, 'INVALID_RESPONSE', 'Could not restore your connection. Please try again.');
    }
    return { access_token: body.access_token, refresh_token: body.refresh_token };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      'Could not restore your connection. Check your internet connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}
