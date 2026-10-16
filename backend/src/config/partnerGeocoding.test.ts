import { afterEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const native = { reverseGeocodeAsync: vi.fn() };
const source = readFileSync(new URL('../../../apps/partner/src/location/geocoding.ts', import.meta.url), 'utf8');
const moduleOutput = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports: { reverseGeocodeDistrict: (coords: { latitude: number; longitude: number }) => Promise<string | null>; reverseGeocodeAddress: (coords: { latitude: number; longitude: number }) => Promise<string | null> } = {} as never;
vm.runInNewContext(moduleOutput, {
  exports,
  require: (id: string) => {
    if (id === 'expo-location') return native;
    if (id === 'react-native') return { AppState: { currentState: 'active' } };
    if (id === '../api/baseUrl') return { API_BASE_URL: 'http://192.168.1.20:4000' };
    throw new Error(`Unexpected dependency: ${id}`);
  },
  AbortController,
  setTimeout: (...args: Parameters<typeof setTimeout>) => globalThis.setTimeout(...args),
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => globalThis.clearTimeout(timer),
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
});
const { reverseGeocodeAddress, reverseGeocodeDistrict } = exports;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('partner map pin address', () => {
  it('uses the proxy locality for confirmation instead of an unrelated broad native region', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ addressLabel: 'Kaup Main Road, Udupi', city: 'Udupi' }) }));
    native.reverseGeocodeAsync.mockResolvedValue([{ district: 'Mysore Division' }]);
    expect(await reverseGeocodeDistrict({ latitude: 13.2, longitude: 74.7 })).toBe('Udupi');
    expect(native.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('uses the resolved backend host and Google-proxy label without native geocoding', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ addressLabel: 'Kaup Main Road, Udupi' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await reverseGeocodeAddress({ latitude: 13.2, longitude: 74.7 })).toBe('Kaup Main Road, Udupi');
    expect(fetchMock).toHaveBeenCalledWith('http://192.168.1.20:4000/location/reverse-geocode?lat=13.2&lng=74.7', { signal: expect.any(AbortSignal) });
    expect(native.reverseGeocodeAsync).not.toHaveBeenCalled();
  });

  it('keeps native address fallback when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    native.reverseGeocodeAsync.mockResolvedValue([{ name: 'Market', district: 'Udupi' }]);
    expect(await reverseGeocodeAddress({ latitude: 13.2, longitude: 74.7 })).toBe('Market, Udupi');
  });

  it('returns no fabricated address when both providers fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    native.reverseGeocodeAsync.mockRejectedValue(new Error('unavailable'));
    expect(await reverseGeocodeAddress({ latitude: 13.2, longitude: 74.7 })).toBeNull();
  });

  it('aborts a stalled proxy after five seconds and falls back to the device', async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      requestSignal = options.signal;
      requestSignal?.addEventListener('abort', () => reject(new Error('aborted')));
    })));
    native.reverseGeocodeAsync.mockResolvedValue([{ name: 'Market', district: 'Udupi' }]);
    const pending = reverseGeocodeAddress({ latitude: 13.2, longitude: 74.7 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toBe('Market, Udupi');
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the abort timer after a successful proxy response', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ addressLabel: 'Kaup' }) }));
    expect(await reverseGeocodeAddress({ latitude: 13.2, longitude: 74.7 })).toBe('Kaup');
    expect(vi.getTimerCount()).toBe(0);
  });

});
