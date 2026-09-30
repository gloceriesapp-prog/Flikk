// Runnable self-check for createApiClient's non-trivial branches — the
// refresh-and-retry, the guest-guarded dead-session callback, and the
// network-error wrapping. No framework: `npx tsx src/auth/client.selfcheck.ts`
// from packages/shared. Fails loudly (assert) if any branch regresses.
//
// ponytail: covers the four paths that carry real behavior; not exhaustive
// over every method/status.

import assert from 'node:assert';
import { createApiClient, ApiError } from './client';

type FetchImpl = (url: string, init: any) => Promise<any>;
const realFetch = globalThis.fetch;
function stubFetch(fn: FetchImpl) {
  (globalThis as any).fetch = fn as any;
}
function jsonRes(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

async function run() {
  // 1. 401 → refresh returns a token → retry succeeds. onSessionExpired must NOT fire.
  {
    let expired = false;
    let calls = 0;
    stubFetch(async () => {
      calls += 1;
      return calls === 1 ? jsonRes(401, { error: { code: 'EXPIRED' } }) : jsonRes(200, { ok: true });
    });
    const { apiRequest } = createApiClient({
      baseUrl: 'http://x',
      getAccessToken: () => 'tok',
      refresh: async () => 'new-tok',
      onSessionExpired: () => { expired = true; },
    });
    const out = await apiRequest<{ ok: boolean }>('/thing');
    assert.deepEqual(out, { ok: true }, 'retry after refresh should return retried body');
    assert.equal(expired, false, 'recovered session must not fire onSessionExpired');
  }

  // 2. 401 with a token, refresh returns null → onSessionExpired FIRES, ApiError thrown.
  {
    let expired = false;
    stubFetch(async () => jsonRes(401, { error: { code: 'DEAD' } }));
    const { apiRequest } = createApiClient({
      baseUrl: 'http://x',
      getAccessToken: () => 'tok',
      refresh: async () => null,
      onSessionExpired: () => { expired = true; },
    });
    await assert.rejects(() => apiRequest('/thing'), (e: any) => e instanceof ApiError && e.status === 401);
    assert.equal(expired, true, 'dead session WITH a token must fire onSessionExpired');
  }

  // 3. 401 as a GUEST (no token) → onSessionExpired must NOT fire (guest guard).
  {
    let expired = false;
    stubFetch(async () => jsonRes(401, { error: { code: 'DEAD' } }));
    const { apiRequest } = createApiClient({
      baseUrl: 'http://x',
      getAccessToken: () => null,
      refresh: async () => null,
      onSessionExpired: () => { expired = true; },
    });
    await assert.rejects(() => apiRequest('/thing'), (e: any) => e instanceof ApiError);
    assert.equal(expired, false, 'guest (no token) must NOT fire onSessionExpired');
  }

  // 4. fetch throws (network down) → wrapped as ApiError(0, 'NETWORK_ERROR').
  {
    stubFetch(async () => { throw new TypeError('Network request failed'); });
    const { apiRequest } = createApiClient({ baseUrl: 'http://x', getAccessToken: () => null });
    await assert.rejects(
      () => apiRequest('/thing'),
      (e: any) => e instanceof ApiError && e.status === 0 && e.code === 'NETWORK_ERROR',
    );
  }

  globalThis.fetch = realFetch;
  console.log('client.selfcheck: all branches OK');
}

run().catch((e) => {
  globalThis.fetch = realFetch;
  console.error(e);
  process.exit(1);
});
