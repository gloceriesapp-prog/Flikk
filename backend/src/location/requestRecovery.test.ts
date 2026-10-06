import { afterEach, expect, it, vi } from 'vitest';
import { LocationRequestGate } from '../../../apps/customer/src/location/requestGate';
import { withDeadline } from '../../../apps/customer/src/utils/deadline';
import { createApiClient } from '../../../packages/shared/src/auth/client';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('rejects reverse-geocode responses from a prior pin or unmounted screen', () => {
 const gate = new LocationRequestGate(); const old = gate.begin(); const current = gate.begin();
 expect(gate.current(old)).toBe(false); expect(gate.current(current)).toBe(true);
 gate.invalidate(); expect(gate.current(current)).toBe(false);
});
it('bounds native GPS waits and ignores late native results', async () => {
 vi.useFakeTimers(); let resolve!: (value: string) => void;
 const result = withDeadline(new Promise<string>(r => { resolve = r; }), 15000);
 const check = expect(result).rejects.toThrow('timed out'); await vi.advanceTimersByTimeAsync(15000); await check;
 resolve('late GPS'); expect(vi.getTimerCount()).toBe(0);
});
it('releases the native deadline timer after a successful result', async () => {
 vi.useFakeTimers(); expect(await withDeadline(Promise.resolve('GPS'), 15000)).toBe('GPS'); expect(vi.getTimerCount()).toBe(0);
});
it('does not treat an unreadable successful checkout response as a valid order', async () => {
 vi.stubGlobal('fetch', vi.fn(async () => new Response('truncated', { status: 201 })));
 const client = createApiClient({ baseUrl: 'https://api.test', getAccessToken: () => null });
 await expect(client.apiRequest('/orders', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
it('bounds HTTP request waits with the shared deadline', async () => {
 vi.useFakeTimers();
 vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new Error('aborted'))))));
 const client = createApiClient({ baseUrl: 'https://api.test', getAccessToken: () => null });
 const check = expect(client.apiRequest('/checkout/quote', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
 await vi.advanceTimersByTimeAsync(20000); await check;
});
