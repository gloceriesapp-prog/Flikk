// Short in-memory response cache for GET routes that change rarely (home
// tabs, category sections, the store list) but are read on nearly every
// screen load — real cost under concurrent load since every mount was
// hitting Postgres via Supabase's PostgREST layer for data that's usually
// identical to the request a few seconds earlier. Deliberately not Redis —
// one process, no cross-instance sharing needed yet (CLAUDE.md's own "don't
// build infra ahead of real scale" rule); swap this for Redis the day the
// backend actually runs as more than one instance, since an in-memory cache
// per-instance stops being globally correct at that point.
//
// Keyed by the exact request path + query string, so /stores and
// /stores?zone_id=x cache separately. TTL is short (30s) on purpose — a
// founder adding a category in admin should show up on the customer app
// within half a minute, not be stale for minutes.

import type { NextFunction, Request, Response } from 'express';

interface CacheEntry {
  body: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function shortCache(ttlMs = 30_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const cached = store.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 200) store.set(key, { body, expiresAt: Date.now() + ttlMs });
      return originalJson(body);
    };

    next();
  };
}
