// Proxies Mappls's Autosuggest REST API — the static access_token this key
// uses is IP-whitelisted to this server (see Mappls console), which is
// exactly why it must never ship inside a mobile app bundle: a phone's IP
// won't match the whitelist, only this backend's will. Not auth-scoped —
// place search isn't store/user data, same "public utility" treatment as
// /zones.
//
// Deliberately text-only: Mappls's free/pay-as-you-go tier does NOT
// return latitude/longitude from Autosuggest, Geocode, or Place Details —
// coordinates are a PREMIUM-gated response field on their side (confirmed
// against their docs). So this endpoint returns place labels only; the
// caller (packages/shared's searchPlaces) resolves each label to actual
// coordinates via the free on-device geocoder. If Mappls ever adds a
// premium plan with coordinates, swap this response shape then — not
// worth guessing at now.
//
// Known gap, don't re-diagnose this from scratch later: local/sandboxed
// dev environments that tunnel traffic (Cloudflare WARP, some VPNs, this
// Claude Code sandbox included) rotate the outbound IP on every single
// request — confirmed by hitting ifconfig.me three times a second apart
// and getting three different addresses. No IP you whitelist in the
// Mappls console will ever match from an environment like that, so
// Mappls returns 401 "IP/Domain validation failed" even with a correctly
// configured key, and this route degrades to `{ labels: [] }` (by
// design — see the !mapplsRes.ok branch below, never a crash). That 401
// is expected there, not a bug. Once /backend is actually deployed
// (Railway/Render, per CLAUDE.md) it'll have one stable IP — whitelist
// that instead and this stops being an issue. Until then, either test
// from a real stable-IP network, or temporarily set this key's Mappls
// restriction to allow-all for local testing (re-restrict before/at
// deploy).
import { Router } from 'express';
import { env } from '../config/env.js';
import { reverseGeocode } from '../lib/reverseGeocode.js';

export const locationRouter = Router();

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

    const mapplsRes = await fetch(url);
    if (!mapplsRes.ok) return res.json({ labels: [] });

    const data = (await mapplsRes.json()) as MapplsAutosuggestResponse;
    const labels = (data.suggestedLocations ?? [])
      .map((loc) => {
        if (!loc.placeName) return null;
        if (loc.placeAddress && loc.placeAddress !== loc.placeName) return `${loc.placeName}, ${loc.placeAddress}`;
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

    const googleRes = await fetch(url);
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
