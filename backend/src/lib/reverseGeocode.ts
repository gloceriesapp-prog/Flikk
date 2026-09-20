// Real coordinates -> address logic, extracted from routes/location.ts's
// own GET /reverse-geocode (that route now just calls this and returns
// the result) so a SECOND real caller — routes/partner.ts's GET /store —
// can reuse the exact same accurate Google Geocoding lookup to backfill a
// store's address_line from its already-pinned lat/lng, instead of a
// second, divergent copy of this same logic.
import { env } from '../config/env.js';

interface GoogleGeocodeResult {
  formatted_address?: string;
  address_components?: { long_name: string; types: string[] }[];
}

interface GoogleGeocodeResponse {
  status: string;
  results?: GoogleGeocodeResult[];
}

function pickComponent(components: GoogleGeocodeResult['address_components'], ...types: string[]): string | null {
  if (!components) return null;
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match.long_name;
  }
  return null;
}

export interface ReverseGeocodeResult {
  addressLabel: string | null;
  shortName: string | null;
  city: string | null;
}

const NULL_RESULT: ReverseGeocodeResult = { addressLabel: null, shortName: null, city: null };

// Degrades to NULL_RESULT — never throws — whenever the key isn't
// configured or Google's own call fails, same "never block the caller"
// convention this always had as an inline route handler.
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!env.googleGeocodingApiKey) return NULL_RESULT;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NULL_RESULT;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', env.googleGeocodingApiKey);

    const googleRes = await fetch(url);
    if (!googleRes.ok) return NULL_RESULT;

    const data = (await googleRes.json()) as GoogleGeocodeResponse;
    // results[0] is Google's own best/most-precise match — already
    // ordered rooftop/street-address first, no re-ranking needed here.
    const best = data.status === 'OK' ? data.results?.[0] : undefined;
    if (!best?.formatted_address) return NULL_RESULT;

    const city =
      pickComponent(best.address_components, 'locality') ??
      pickComponent(best.address_components, 'sublocality', 'sublocality_level_1') ??
      pickComponent(best.address_components, 'administrative_area_level_3') ??
      pickComponent(best.address_components, 'administrative_area_level_2') ??
      null;

    // A bare Plus Code ("7PMX+WC4, Yenna Gudde, Karnataka") is Google's own
    // genuine result for a point with no closer-by named address, common
    // in this app's own rural launch zone (CLAUDE.md) — still real data,
    // but reads as broken/meaningless as a headline. Prefer a real
    // neighborhood/city chain instead when the formatted_address starts
    // with one; fall back to the Plus Code only if there's truly nothing
    // better.
    const isPlusCode = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(best.formatted_address);
    const neighborhood = pickComponent(best.address_components, 'neighborhood', 'sublocality_level_2');
    const fallbackLabel = [neighborhood, city].filter(Boolean).join(', ');
    const addressLabel = isPlusCode && fallbackLabel ? fallbackLabel : best.formatted_address;

    // Real named-place components, not a naive addressLabel.split(',')[0]
    // (grabs whatever precedes Google's first comma, often a house number
    // or Plus Code). point_of_interest leads (a real landmark should
    // headline with ITS name) — premise/subpremise deliberately excluded
    // even though real, named data: Google's own premise value for a
    // residential point is usually a bare plot number, which reads worse
    // as a headline than the neighborhood it sits in.
    const shortName =
      pickComponent(best.address_components, 'point_of_interest') ??
      neighborhood ??
      pickComponent(best.address_components, 'sublocality_level_1', 'sublocality') ??
      city ??
      addressLabel;

    return { addressLabel, shortName, city };
  } catch {
    return NULL_RESULT;
  }
}
