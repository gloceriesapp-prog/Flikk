// Public location utilities: validate input, admit across replicas, coalesce
// identical reads, then apply provider-budget and deadline safeguards.
import { Router } from 'express';
import { env } from '../config/env.js';
import { reverseGeocode } from '../lib/reverseGeocode.js';
import { mapsBudget } from '../customer-experience/mapsBudget.js';
import { shortCache } from '../middleware/shortCache.js';
import { AppError } from '../lib/errors.js';
import { validPin } from '../lib/checkoutEligibility.js';

export const locationRouter = Router();
locationRouter.use((req, _res, next) => {
  if (req.method !== 'GET') return next(new AppError(405, 'METHOD_NOT_ALLOWED', 'Use a location lookup request.'));
  if (req.path === '/search') {
    if (typeof req.query.q !== 'string' || req.query.q.trim().length < 3 || req.query.q.length > 120)
      return next(new AppError(400, 'INVALID_LOCATION_QUERY', 'Enter between 3 and 120 characters.'));
  } else if (req.path === '/reverse-geocode' || req.path === '/nearby') {
    if (typeof req.query.lat !== 'string' || typeof req.query.lng !== 'string' || !req.query.lat.trim() || !req.query.lng.trim()
      || !validPin(Number(req.query.lat), Number(req.query.lng))) return next(new AppError(400, 'INVALID_COORDINATES', 'Choose a valid map location.'));
  } else return next(new AppError(404, 'LOCATION_ROUTE_NOT_FOUND', 'Location endpoint not found.'));
  return next();
});
locationRouter.use(mapsBudget('client'), shortCache(60_000), mapsBudget('provider'));

interface MapplsAutosuggestLocation {
  placeName?: string;
  placeAddress?: string;
}

interface MapplsAutosuggestResponse {
  suggestedLocations?: MapplsAutosuggestLocation[];
}

locationRouter.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q as string | undefined)?.trim();
    if (!query) return res.json({ labels: [] });

    const url = new URL('https://search.mappls.com/search/places/autosuggest/json');
    url.searchParams.set('query', query);
    url.searchParams.set('region', 'IND');
    url.searchParams.set('access_token', env.mapplsAccessToken);

    const mapplsRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!mapplsRes.ok) throw new AppError(503, 'LOCATION_PROVIDER_UNAVAILABLE', 'Place search is temporarily unavailable. Try the map instead.');

    const data = (await mapplsRes.json()) as MapplsAutosuggestResponse;
    if (data.suggestedLocations != null && !Array.isArray(data.suggestedLocations)) throw new AppError(503, 'LOCATION_PROVIDER_UNAVAILABLE', 'Place search is temporarily unavailable.');
    const labels = (data.suggestedLocations ?? [])
      .map((loc) => {
        if (!loc || typeof loc.placeName !== 'string') return null;
        if (typeof loc.placeAddress === 'string' && loc.placeAddress && loc.placeAddress !== loc.placeName) return `${loc.placeName}, ${loc.placeAddress}`;
        return loc.placeName;
      })
      .filter((label): label is string => label !== null)
      .slice(0, 6);

    res.json({ labels });
  } catch (err) {
    next(err);
  }
});

// Coordinates -> genuine address, real village/street naming (Google's
// results, not the coarse on-device fallback). Degrades to
// { addressLabel: null } — never a 500 — whenever the key isn't
// configured or Google's own call fails, same "never block the caller"
// convention /search above already uses; apps/customer's geocoding.ts
// falls back to the on-device geocoder when it sees a null addressLabel.
locationRouter.get('/reverse-geocode', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ addressLabel: null });

    const result = await reverseGeocode(lat, lng);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

interface GooglePlaceResult {
  name?: string;
  vicinity?: string;
  types?: string[];
  geometry?: { location?: { lat: number; lng: number } };
}

interface GoogleNearbyResponse {
  status: string;
  results?: GooglePlaceResult[];
}

// Real nearby landmarks (a mall/temple/school within ~200m) — same key as
// /reverse-geocode above (server-side, IP-restricted), but this hits
// Places Nearby Search, a different Google API than Geocoding. If this
// starts returning REQUEST_DENIED, the fix is enabling "Places API" for
// this key in Google Cloud Console, not touching this code — Geocoding
// API being enabled doesn't imply Places API is.
//
// Shown as tappable chips under LocationSearchScreen.tsx's confirm card
// once the pin settles — "is this near XYZ Mall?" is a more confident
// confirmation than a bare address for a customer who knows their area by
// landmarks, not street names (common in this app's own semi-rural launch
// zone, CLAUDE.md). Never blocks confirming the plain reverse-geocoded
// address — this is a suggestion layer on top, not a requirement.
locationRouter.get('/nearby', async (req, res, next) => {
  try {
    if (!env.googleGeocodingApiKey) return res.json({ places: [] });

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ places: [] });

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('rankby', 'distance');
    url.searchParams.set('key', env.googleGeocodingApiKey);

    const googleRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!googleRes.ok) return res.json({ places: [] });

    const data = (await googleRes.json()) as GoogleNearbyResponse;
    if (data.status !== 'OK') return res.json({ places: [] });

    // route/street_address/locality entries aren't landmarks a customer
    // would recognize their pin by — filtered out in favor of real named
    // establishments/points of interest, closest-first (rankby=distance
    // above already orders these), capped at 5 so the chip row stays a
    // single scannable line.
    const EXCLUDED_TYPES = new Set(['route', 'street_address', 'locality', 'political', 'plus_code']);
    const places = (data.results ?? [])
      .filter((place) => place.name && !(place.types ?? []).every((type) => EXCLUDED_TYPES.has(type)))
      .slice(0, 5)
      .map((place) => ({
        name: place.name,
        latitude: place.geometry?.location?.lat ?? null,
        longitude: place.geometry?.location?.lng ?? null,
      }));

    res.json({ places });
  } catch (err) {
    next(err);
  }
});
