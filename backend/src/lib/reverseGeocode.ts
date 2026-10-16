import { env } from '../config/env.js';

interface GoogleGeocodeResult {
  formatted_address?: string;
  address_components?: { long_name?: string; types?: string[] }[];
}

export interface ReverseGeocodeResult {
  addressLabel: string | null;
  shortName: string | null;
  city: string | null;
  status: 'resolved' | 'not_found' | 'unavailable';
}

function emptyResult(status: 'not_found' | 'unavailable'): ReverseGeocodeResult {
  return { addressLabel: null, shortName: null, city: null, status };
}

function pickComponent(result: GoogleGeocodeResult, ...types: string[]): string | null {
  if (!Array.isArray(result.address_components)) return null;
  for (const type of types) {
    const match = result.address_components.find(component => Array.isArray(component?.types)
      && component.types.includes(type) && typeof component.long_name === 'string' && component.long_name.trim());
    if (match?.long_name) return match.long_name.trim();
  }
  return null;
}

// Preserve the selected coordinates. A provider address describes the pin;
// its geometry must never silently move the customer's delivery destination.
// Failure remains nullable for non-HTTP callers (including store backfill).
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!env.googleGeocodingApiKey) return emptyResult('unavailable');
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return emptyResult('not_found');

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', env.googleGeocodingApiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return emptyResult('unavailable');
    const data = await response.json() as { status?: string; results?: GoogleGeocodeResult[] };
    if (data.status === 'ZERO_RESULTS') return emptyResult('not_found');
    if (data.status !== 'OK' || !Array.isArray(data.results)) return emptyResult('unavailable');

    // Keep Google's closest-first ordering, skipping malformed/blank entries.
    const best = data.results.find(result => typeof result?.formatted_address === 'string' && result.formatted_address.trim());
    if (!best?.formatted_address) return emptyResult('not_found');
    const city = pickComponent(best, 'locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2');
    const neighborhood = pickComponent(best, 'neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality');
    const formatted = best.formatted_address.trim();
    const isPlusCode = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(?:\s|,|$)/i.test(formatted);
    // A Plus Code is a valid precise address. Keep it in the detailed label;
    // use its named locality for the headline rather than discarding address
    // information (state/postcode/road) to manufacture a short label.
    const shortName = pickComponent(best, 'point_of_interest', 'establishment')
      ?? neighborhood ?? pickComponent(best, 'route') ?? city ?? (isPlusCode ? 'Selected location' : formatted);
    return { addressLabel: formatted, shortName, city, status: 'resolved' };
  } catch {
    // Never log the URL: it contains both the API key and precise location.
    return emptyResult('unavailable');
  }
}
