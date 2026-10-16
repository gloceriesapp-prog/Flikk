import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../config/env.js', () => ({ env: { googleRoutesApiKey: 'routes-test-key' } }));
vi.mock('./logger.js', () => ({ logger: { warn: vi.fn() } }));
import { decodePolyline, fetchRoute } from './routeDirections.js';
import { env } from '../config/env.js';
const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const origin = { latitude: 13.27, longitude: 74.75 };
const destination = { latitude: 13.28, longitude: 74.76 };
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => { env.googleRoutesApiKey = 'routes-test-key'; });
describe('decodePolyline', () => {
  it('decodes Google reference example', () => {
    expect(decodePolyline(encoded)).toEqual([
      { latitude: 38.5, longitude: -120.2 }, { latitude: 40.7, longitude: -120.95 }, { latitude: 43.252, longitude: -126.453 },
    ]);
  });
  it.each(['', '_', '????_', '~'.repeat(20), '\u0000?', '?'])('rejects malformed data %s', input => { expect(decodePolyline(input)).toEqual([]); });
  it('rejects oversized data', () => { expect(decodePolyline('?'.repeat(200_002))).toEqual([]); });
});
describe('fetchRoute', () => {
  it('uses server Routes credentials, minimal fields and an abort deadline', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [{ polyline: { encodedPolyline: encoded }, duration: '120.5s', distanceMeters: 1500 }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRoute(origin, destination)).toEqual({ points: decodePolyline(encoded), durationSec: 120.5, distanceM: 1500 });
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://routes.googleapis.com/directions/v2:computeRoutes');
    expect(request.headers['X-Goog-Api-Key']).toBe('routes-test-key');
    expect(request.headers['X-Goog-FieldMask']).toBe('routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline');
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(request.body)).toMatchObject({ origin: { location: { latLng: origin } }, destination: { location: { latLng: destination } }, travelMode: 'DRIVE' });
  });
  it('does not call the provider for invalid coordinates or missing credentials', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRoute({ latitude: 91, longitude: 0 }, destination)).toBeNull();
    expect(await fetchRoute(origin, { latitude: 0, longitude: 181 })).toBeNull();
    env.googleRoutesApiKey = '';
    expect(await fetchRoute(origin, destination)).toBeNull(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ ok: false, status: 403 }, { ok: true, json: async () => ({ routes: [] }) }, { ok: true, json: async () => ({ routes: [{ polyline: { encodedPolyline: '_' } }] }) }])('degrades safely when routing is unavailable', async response => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response)); expect(await fetchRoute(origin, destination)).toBeNull();
  });
  it('handles network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('provider failure'))); expect(await fetchRoute(origin, destination)).toBeNull();
  });
  it('rejects invalid ETA/distance values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [{ polyline: { encodedPolyline: encoded }, duration: '-4s', distanceMeters: Infinity }] }) }));
    expect(await fetchRoute(origin, destination)).toMatchObject({ durationSec: null, distanceM: null });
  });
});
