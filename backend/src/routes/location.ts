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
