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

export const locationRouter = Router();

interface MapplsAutosuggestLocation {
  placeName?: string;
  placeAddress?: string;
}

interface MapplsAutosuggestResponse {
  suggestedLocations?: MapplsAutosuggestLocation[];
}

// Google Geocoding API — server-side only, never shipped in the mobile
// bundle. A key restricted for a raw HTTPS Geocoding call can't use
// Google's "Android app" restriction type (that restriction only applies
// to the Maps SDK rendering a map, not the REST Geocoding/Places APIs) —
// so the only safe way to hold this key is IP-restricted, on this server,
// same reasoning the Mappls key above already documents. Do not move this
// call into the app.
//
// Why this exists alongside expo-location's free on-device geocoder
// (apps/customer/src/location/geocoding.ts): that geocoder is Apple's
// CLGeocoder on iOS / the device's own Google-backed Geocoder on Android —
// CLGeocoder is measurably coarse in India outside major metros (often
// resolves no finer than city/state for a village-level coordinate in
// CLAUDE.md's own Kaup/outer-Udupi launch zone), which is the actual
// "not genuine, nearest city instead of my real address" complaint this
// route fixes. Android's on-device result is usually fine already; this
// mainly closes the iOS gap, and gives Android a second, often more
// detailed, opinion too.
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
    if (!env.googleGeocodingApiKey) return res.json({ addressLabel: null });

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ addressLabel: null });

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', env.googleGeocodingApiKey);

    const googleRes = await fetch(url);
    if (!googleRes.ok) return res.json({ addressLabel: null });

    const data = (await googleRes.json()) as GoogleGeocodeResponse;
    // results[0] is Google's own best/most-precise match — already
    // ordered rooftop/street-address first, no re-ranking needed here.
    const best = data.status === 'OK' ? data.results?.[0] : undefined;
    if (!best?.formatted_address) return res.json({ addressLabel: null });

    const city =
      pickComponent(best.address_components, 'locality') ??
      pickComponent(best.address_components, 'sublocality', 'sublocality_level_1') ??
      pickComponent(best.address_components, 'administrative_area_level_3') ??
      pickComponent(best.address_components, 'administrative_area_level_2') ??
      '';

    res.json({ addressLabel: best.formatted_address, city });
  } catch (err) {
    next(err);
  }
});
