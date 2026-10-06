import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('../../../apps/customer/node_modules/expo-secure-store/build/SecureStore.js', () => ({ getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null), setItemAsync: vi.fn(async (key: string, value: string) => { storage.set(key, value); }), deleteItemAsync: vi.fn(async (key: string) => { storage.delete(key); }) }));
vi.mock('../../../apps/customer/src/api/baseUrl', () => ({ API_BASE_URL: 'https://api.test' }));
vi.mock('@gloceries/shared', async () => import('../../../packages/shared/src/auth/client'));
import { useAuthStore } from '../../../apps/customer/src/store/useAuthStore';
import { accountQueryClient, customerIdFromToken, registerAccountReset } from '../../../apps/customer/src/features/account-session/accountCache';
import { apiRequest } from '../../../apps/customer/src/api/client';
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
function token(id: string) { return `header.${Buffer.from(JSON.stringify({ sub: id })).toString('base64url')}.signature`; }
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(async () => { storage.clear(); await useAuthStore.getState().clear(); });
afterEach(() => vi.unstubAllGlobals());
it('clears orders and profile immediately and gives account B a different cache', async () => {
    await useAuthStore.getState().setSession(token(a), 'refresh-a');
    const first = accountQueryClient();
    first.setQueryData(['my-orders', a], ['private-order-a']);
    first.setQueryData(['profile', 'me', a], { phone: 'private-phone-a' });
    await useAuthStore.getState().clear();
    expect(first.getQueryCache().getAll()).toHaveLength(0);
    await useAuthStore.getState().setSession(token(b), 'refresh-b');
    expect(accountQueryClient()).not.toBe(first);
    expect(accountQueryClient().getQueryData(['my-orders', a])).toBeUndefined();
    expect(useAuthStore.getState().customerId).toBe(b);
});
it('rejects account A data arriving after B logs in', async () => {
    await useAuthStore.getState().setSession(token(a), 'refresh-a');
    const response = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => response.promise));
    const request = apiRequest('/orders');
    const rejection = expect(request).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    await useAuthStore.getState().setSession(token(b), 'refresh-b');
    response.resolve(Response.json([{ id: 'a-order' }]));
    await rejection;
});
it('does not refresh old requests with B credentials or log B out after an old 401', async () => {
    await useAuthStore.getState().setSession(token(a), 'refresh-a');
    const response = deferred<Response>();
    const fetch = vi.fn(() => response.promise);
    vi.stubGlobal('fetch', fetch);
    const request = apiRequest('/orders');
    const rejection = expect(request).rejects.toMatchObject({ status: 401 });
    await useAuthStore.getState().setSession(token(b), 'refresh-b');
    response.resolve(Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }));
    await rejection;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().customerId).toBe(b);
});
it('does not install a delayed A refresh over a new B session', async () => {
    await useAuthStore.getState().setSession(token(a), 'refresh-a');
    const response = deferred<Response>();
    const started = deferred<void>();
    const fetch = vi.fn(async (url: string) => { if (url.endsWith('/auth/refresh')) {
        started.resolve();
        return response.promise;
    } return Response.json({}, { status: 401 }); });
    vi.stubGlobal('fetch', fetch);
    const request = apiRequest('/orders');
    const rejection = expect(request).rejects.toMatchObject({ status: 401 });
    await started.promise;
    await useAuthStore.getState().setSession(token(b), 'refresh-b');
    response.resolve(Response.json({ access_token: token(a), refresh_token: 'late-refresh-a' }));
    await rejection;
    expect(useAuthStore.getState().accessToken).toBe(token(b));
    expect(JSON.parse(storage.get('gloceries_customer_session_v2')!).refreshToken).toBe('refresh-b');
});
it('runs resets before publishing the new identity and preserves identity on token refresh', async () => {
    await useAuthStore.getState().setSession(token(a), 'refresh-a');
    const seen: string[] = [];
    const stop = registerAccountReset(() => seen.push(useAuthStore.getState().customerId!));
    const first = accountQueryClient();
    await useAuthStore.getState().setTokens(token(a), 'new-refresh-a');
    expect(accountQueryClient()).toBe(first);
    await useAuthStore.getState().setSession(token(b), 'refresh-b');
    expect(seen).toEqual([a]);
    stop();
});
it('accepts only valid JWT subjects as the cache namespace', () => {
    expect(customerIdFromToken(token(a))).toBe(a);
    for (const bad of [null, 'oops', token('guest'), token('00000000---------------------------')])
        expect(customerIdFromToken(bad)).toBeNull();
});

import * as SecureStore from '../../../apps/customer/node_modules/expo-secure-store/build/SecureStore.js';
import { useLocationStore } from '../../../apps/customer/src/store/useLocationStore';
it('serializes a delayed credential write before logout deletion',async()=>{
 const write=deferred<void>();
 vi.mocked(SecureStore.setItemAsync).mockImplementationOnce(async(key:string,value:string)=>{await write.promise;storage.set(key,value);});
 const login=useAuthStore.getState().setSession(token(a),'refresh-a');
 await Promise.resolve();
 const logout=useAuthStore.getState().clear();
 expect(useAuthStore.getState().customerId).toBeNull();
 write.resolve();await login;await logout;
 expect(storage.has('gloceries_customer_access_token')).toBe(false);expect(storage.has('gloceries_customer_refresh_token')).toBe(false);
});
it('prevents late location hydration and writes from restoring a logged-out address',async()=>{
 await useLocationStore.getState().clear();
 const address={latitude:1,longitude:2,addressLabel:'Private address A',city:'A city'};
 const read=deferred<string|null>();vi.mocked(SecureStore.getItemAsync).mockImplementationOnce(()=>read.promise);
 const hydrate=useLocationStore.getState().hydrate();const clearing=useLocationStore.getState().clear();read.resolve(JSON.stringify(address));await hydrate;await clearing;
 expect(useLocationStore.getState().location).toBeNull();
 const saving=useLocationStore.getState().setLocation(address);const logout=useLocationStore.getState().clear();await saving;await logout;
 expect(useLocationStore.getState().location).toBeNull();expect(storage.has('gloceries_customer_delivery_location')).toBe(false);
});

it('retains an authenticated session when remote refresh is unavailable', async () => {
 await useAuthStore.getState().setSession(token(a), 'refresh-a');
 const fetch = vi.fn(async (url: string) => url.endsWith('/auth/refresh') ? Promise.reject(new Error('offline')) : Response.json({}, { status: 401 }));
 vi.stubGlobal('fetch', fetch);
 await expect(apiRequest('/orders')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
 expect(useAuthStore.getState().customerId).toBe(a);
 expect(useAuthStore.getState().refreshToken).toBe('refresh-a');
});
it('recovers startup after secure storage is unavailable', async () => {
 vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('device locked'));
 await useAuthStore.getState().hydrate();
 expect(useAuthStore.getState().isHydrated).toBe(true);
 expect(useAuthStore.getState().hydrationError).toBeTruthy();
 await useAuthStore.getState().hydrate();
 expect(useAuthStore.getState().hydrationError).toBeNull();
});
it('a logout tombstone prevents restoration from undeleted legacy tokens', async () => {
 await useAuthStore.getState().setSession(token(a), 'refresh-a');
 storage.set('gloceries_customer_access_token', token(a)); storage.set('gloceries_customer_refresh_token', 'legacy-refresh');
 vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('delete failed')).mockRejectedValueOnce(new Error('delete failed'));
 await useAuthStore.getState().clear();
 await useAuthStore.getState().hydrate();
 expect(useAuthStore.getState().customerId).toBeNull();
 expect(useAuthStore.getState().accessToken).toBeNull();
});
it('does not replace a saved token pair when its atomic write fails', async () => {
 await useAuthStore.getState().setSession(token(a), 'refresh-a');
 const previous = storage.get('gloceries_customer_session_v2');
 vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage full'));
 await expect(useAuthStore.getState().setTokens(token(a), 'rotated-refresh')).rejects.toThrow('storage full');
 expect(storage.get('gloceries_customer_session_v2')).toBe(previous);
});

it('keeps a failed logout hidden and retries sign-out instead of restoring old tokens', async () => {
 await useAuthStore.getState().setSession(token(a), 'refresh-a');
 vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage unavailable'));
 vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('storage unavailable'));
 await expect(useAuthStore.getState().clear()).rejects.toThrow('storage unavailable');
 expect(useAuthStore.getState().customerId).toBeNull(); expect(useAuthStore.getState().hydrationError).toBeTruthy();
 await useAuthStore.getState().hydrate();
 expect(useAuthStore.getState().customerId).toBeNull(); expect(useAuthStore.getState().hydrationError).toBeNull();
 expect(JSON.parse(storage.get('gloceries_customer_session_v2')!).accessToken).toBeNull();
});

it('does not expose account B or restore account A after a failed account-switch write', async () => {
 await useAuthStore.getState().setSession(token(a), 'refresh-a');
 vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('write failed'));
 await expect(useAuthStore.getState().setSession(token(b), 'refresh-b')).rejects.toThrow('write failed');
 expect(useAuthStore.getState().customerId).toBeNull();
 await useAuthStore.getState().hydrate();
 expect(useAuthStore.getState().customerId).toBeNull();
 expect(JSON.parse(storage.get('gloceries_customer_session_v2')!).accessToken).toBeNull();
});
