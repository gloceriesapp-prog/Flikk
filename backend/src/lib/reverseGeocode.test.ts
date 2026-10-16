import { afterEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ googleGeocodingApiKey: 'fake-server-key' }));
vi.mock('../config/env.js', () => ({ env: config }));
import { reverseGeocode } from './reverseGeocode.js';

afterEach(() => { vi.unstubAllGlobals(); config.googleGeocodingApiKey = 'fake-server-key'; });
function provider(body: unknown, ok = true) {
  const request = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal('fetch', request);
  return request;
}
describe('reverse geocoded delivery address', () => {
  it('keeps the full Plus Code address with a real locality headline', async () => {
    const request = provider({ status: 'OK', results: [{ formatted_address: '7PMX+WC4, Yenna Gudde, Karnataka 574106, India', address_components: [
      { long_name: 'Yenna Gudde', types: ['sublocality_level_1'] },
      { long_name: 'Udupi', types: ['administrative_area_level_2'] },
    ] }] });
    expect(await reverseGeocode(13.2743, 74.7597)).toEqual({ addressLabel: '7PMX+WC4, Yenna Gudde, Karnataka 574106, India', shortName: 'Yenna Gudde', city: 'Udupi', status: 'resolved' });
    const url = new URL(request.mock.calls[0]![0]);
    expect(url.searchParams.get('latlng')).toBe('13.2743,74.7597');
    expect(url.searchParams.get('language')).toBe('en');
    expect(request.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });
  it('skips blank entries and uses a street when there is no neighborhood', async () => {
    provider({ status: 'OK', results: [{ formatted_address: ' ' }, { formatted_address: 'Main Road, Kaup', address_components: [{ long_name: 'Main Road', types: ['route'] }, { long_name: 'Kaup', types: ['locality'] }] }] });
    expect(await reverseGeocode(13.2, 74.7)).toMatchObject({ shortName: 'Main Road', addressLabel: 'Main Road, Kaup', city: 'Kaup' });
  });
  it.each(['REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'UNKNOWN_ERROR'])('makes %s retryable without a fabricated label', async status => {
    provider({ status, error_message: 'secret provider text' });
    expect(await reverseGeocode(13.2, 74.7)).toEqual({ addressLabel: null, shortName: null, city: null, status: 'unavailable' });
  });
  it('distinguishes valid coordinates without a named address', async () => {
    provider({ status: 'ZERO_RESULTS' });
    expect(await reverseGeocode(13.2, 74.7)).toMatchObject({ status: 'not_found', addressLabel: null });
  });
  it('does not call Google for invalid coordinates or missing configuration', async () => {
    const request = provider({ status: 'OK' });
    expect((await reverseGeocode(91, 74)).status).toBe('not_found');
    config.googleGeocodingApiKey = '';
    expect((await reverseGeocode(13, 74)).status).toBe('unavailable');
    expect(request).not.toHaveBeenCalled();
  });
  it('handles malformed components without losing the formatted address', async () => {
    provider({ status: 'OK', results: [{ formatted_address: 'Kaup, Karnataka', address_components: [{ types: null }, null] }] });
    expect(await reverseGeocode(13, 74)).toMatchObject({ status: 'resolved', addressLabel: 'Kaup, Karnataka' });
  });
  it('returns retryable failure for a network timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect((await reverseGeocode(13, 74)).status).toBe('unavailable');
  });
});
