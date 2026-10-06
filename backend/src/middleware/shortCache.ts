// Short in-memory response cache for GET routes that change rarely (home
// tabs, category sections, the store list) but are read on nearly every
// screen load — real cost under concurrent load since every mount was
// hitting Postgres via Supabase's PostgREST layer for data that's usually
// identical to the request a few seconds earlier. Deliberately not Redis —
// each process invalidates its own cache through the shared database channel.
// A distributed cache can later reduce duplicated cold reads across instances.
//
// Keyed by the exact request path + query string, so /stores and
// /stores?zone_id=x cache separately. TTL is short (30s) on purpose — a
// founder adding a category in admin should show up on the customer app
// within half a minute, not be stale for minutes.

import { metrics } from '../observability/metrics.js';

import type { NextFunction, Request, Response } from 'express';

interface CacheEntry {
  body: unknown;
  expiresAt: number;
  bytes: number;
}

const store = new Map<string, CacheEntry>();
let cachedBytes = 0;
function evict(key: string) {
  cachedBytes -= store.get(key)?.bytes ?? 0;
  store.delete(key);
}
const inflight = new Map<string, Set<{ valid: boolean }>>();
function matches(key: string, prefix?: string) {
  const path = key.split('?')[0]!;
  return !prefix || path === prefix || path.startsWith(`${prefix}/`);
}

// Invalidate before broadcasting database changes. In-flight responses from
// before an invalidation must not repopulate the cache with stale stock.
export function invalidateShortCache(prefix?: string) {
  invalidateMatchingCache(key => matches(key, prefix));
}
function invalidateMatchingCache(matchesKey: (key: string) => boolean) {
  for (const key of store.keys()) if (matchesKey(key)) evict(key);
  for (const [key, requests] of inflight) if (matchesKey(key)) {
    for (const request of requests) request.valid = false;
  }
}

export function invalidateInventoryCache(storeId: string, storeChanged: boolean) {
  invalidateMatchingCache(key => {
    const path = key.split('?')[0]!;
    if (path === `/stores/${storeId}` || path.startsWith(`/stores/${storeId}/`)) return true;
    // Cross-store product routes can gain a newly approved/restocked item.
    if (path.startsWith('/browse/') || path.startsWith('/stores/products/') || /^\/categories\/(?:subcategories\/)?[^/]+\/products$/.test(path)) return true;
    return storeChanged && (path === '/stores' || path === '/stores/nearest' || path === '/stores/serviceability');
  });
}

// Public JSON reads only. Each process owns one leader per canonical URL;
// followers share success/error responses without starting another DB read.
const flights = new Map<string, { valid: boolean; followers: Set<Response> }>();
let waiting = 0;
let activeLeaders = 0;
const MAX_WAITERS = 4000;
function cacheKey(url: string) {
  const [path, search] = url.split('?');
  const query = new URLSearchParams(search);
  // Equivalent coordinate strings share a hot-address result. Do not round
  // different addresses into one key: radius-edge eligibility is exact.
  if (path === '/stores/nearest' || path === '/stores/serviceability') {
    for (const name of ['lat', 'lng']) {
      const values = query.getAll(name);
      if (values.length === 1 && values[0]!.trim() && Number.isFinite(Number(values[0])))
        query.set(name, String(Number(values[0])));
    }
  }
  query.sort();
  return `${path}${query.size ? `?${query}` : ''}`;
}
function busy(res: Response) {
  res.set?.('Retry-After', '1');
  res.statusCode = 503;
  res.json({ error: { code: 'READ_BUSY', message: 'Please try again shortly.' } });
}
export function shortCache(ttlMs = 30_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const key = cacheKey(req.originalUrl);
    const cached = store.get(key);
    if (cached && cached.expiresAt > Date.now()) { metrics.increment('flikk_read_cache_requests_total', { outcome: 'hit' }); store.delete(key); store.set(key, cached); res.json(cached.body); return; }
    evict(key);
    const existing = flights.get(key);
    if (existing?.valid) {
      metrics.increment('flikk_read_cache_requests_total', { outcome: 'coalesced' });
      if (waiting >= MAX_WAITERS || existing.followers.size >= 1000) { busy(res); return; }
      waiting++; existing.followers.add(res);
      const cleanup = () => {
        if (existing.followers.delete(res)) waiting--;
        clearTimeout(timer);
      };
      const timer = setTimeout(() => { cleanup(); if (!res.destroyed && !res.writableEnded) busy(res); }, 15_000);
      timer.unref();
      res.once?.('finish', cleanup); res.once?.('close', cleanup);
      return;
    }
    metrics.increment('flikk_read_cache_requests_total', { outcome: 'miss' });
    if (activeLeaders >= 1000) { busy(res); return; }
    const flight = { valid: true, followers: new Set<Response>() };
    activeLeaders++;
    flights.set(key, flight);
    let requests = inflight.get(key);
    if (!requests) inflight.set(key, requests = new Set());
    // The same validity ticket protects the leader cache write and followers.
    requests.add(flight);
    let completed = false;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      activeLeaders--;
      requests.delete(flight);
      if (!requests.size && inflight.get(key) === requests) inflight.delete(key);
      if (flights.get(key) === flight) flights.delete(key);
      if (!completed) for (const follower of [...flight.followers]) {
        flight.followers.delete(follower); waiting--;
        if (!follower.destroyed && !follower.writableEnded) busy(follower);
      }
    };
    res.once?.('finish', cleanup); res.once?.('close', cleanup);
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      completed = true;
      if (res.statusCode === 200 && flight.valid) {
        // Entries and per-response size are bounded; skip oversized catalogues.
        const bytes = Buffer.byteLength(JSON.stringify(body) ?? '');
        if (bytes <= 1024 * 1024) {
          evict(key);
          while (store.size && (store.size >= 1000 || cachedBytes + bytes > 32 * 1024 * 1024)) evict(store.keys().next().value!);
          store.set(key, { body, bytes, expiresAt: Date.now() + ttlMs * (0.8 + Math.random() * 0.2) });
          cachedBytes += bytes;
        }
      }
      for (const follower of [...flight.followers]) {
        flight.followers.delete(follower); waiting--;
        if (follower.destroyed || follower.writableEnded) continue;
        if (!flight.valid) busy(follower);
        else { follower.statusCode = res.statusCode; follower.json(body); }
      }
      cleanup();
      return originalJson(body);
    };
    next();
  };
}
