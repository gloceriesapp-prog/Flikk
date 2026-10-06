import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { invalidateInventoryCache, invalidateShortCache, shortCache } from './shortCache.js';

function request(path: string) {
  return { method: 'GET', originalUrl: path } as Request;
}
function response() {
  return { statusCode: 200, json: vi.fn() } as unknown as Response;
}
beforeEach(() => invalidateShortCache());
describe('Realtime response-cache invalidation', () => {
  it('evicts matching store routes while retaining unrelated content', () => {
    const cache = shortCache();
    const stock = response();
    cache(request('/stores/shop/products'), stock, vi.fn());
    stock.json({ price: 10 });
    const tabs = response();
    cache(request('/home-tabs'), tabs, vi.fn());
    tabs.json(['Grocery']);
    invalidateShortCache('/stores');
    const stockNext = vi.fn();
    cache(request('/stores/shop/products'), response(), stockNext);
    expect(stockNext).toHaveBeenCalled();
    const tabNext = vi.fn();
    const cached = response();
    cache(request('/home-tabs'), cached, tabNext);
    expect(tabNext).not.toHaveBeenCalled();
    expect(cached.json).toHaveBeenCalledWith(['Grocery']);
  });
  it('does not repopulate stale stock from an in-flight request', () => {
    const cache = shortCache();
    const inflight = response();
    cache(request('/stores/shop/products'), inflight, vi.fn());
    invalidateShortCache('/stores');
    inflight.json({ price: 10 });
    const next = vi.fn();
    cache(request('/stores/shop/products'), response(), next);
    expect(next).toHaveBeenCalled();
  });
  it('handles query strings without evicting a similarly named route', () => {
    const cache = shortCache();
    const stores = response();
    const other = response();
    cache(request('/stores?zone_id=one'), stores, vi.fn());
    stores.json(['Shop']);
    cache(request('/stores-extra'), other, vi.fn());
    other.json(['Other']);
    invalidateShortCache('/stores');
    const next = vi.fn();
    cache(request('/stores?zone_id=one'), response(), next);
    expect(next).toHaveBeenCalled();
    const untouched = vi.fn();
    cache(request('/stores-extra'), response(), untouched);
    expect(untouched).not.toHaveBeenCalled();
  });
});

it('lets unrelated in-flight responses populate cache during inventory churn', () => {
  const cache = shortCache();
  const unrelated = response();
  cache(request('/home-tabs'), unrelated, vi.fn());
  invalidateShortCache('/stores/shop/products');
  unrelated.json(['Grocery']);
  const next = vi.fn();
  cache(request('/home-tabs'), response(), next);
  expect(next).not.toHaveBeenCalled();
});

it('retains unrelated store stock and category metadata on an inventory event', () => {
  const cache = shortCache();
  for (const path of ['/stores/a/products', '/stores/b/products', '/categories', '/categories/x/subcategories', '/categories/x/products']) {
    const res = response(); cache(request(path), res, vi.fn()); res.json([path]);
  }
  invalidateInventoryCache('a', false);
  for (const path of ['/stores/b/products', '/categories', '/categories/x/subcategories']) {
    const next = vi.fn(); cache(request(path), response(), next); expect(next).not.toHaveBeenCalled();
  }
  for (const path of ['/stores/a/products', '/categories/x/products']) {
    const next = vi.fn(); cache(request(path), response(), next); expect(next).toHaveBeenCalled();
  }
});

it('late response cleanup does not remove tracking for a newer request at the same path', () => {
  const cache = shortCache();
  const first = response();
  const finish: (() => void)[] = [];
  first.once = ((event: string, fn: () => void) => { if (event === 'finish') finish.push(fn); return first; }) as Response['once'];
  cache(request('/stores/a/products'), first, vi.fn());
  first.json(['old']);
  invalidateShortCache('/stores/a');
  const second = response();
  cache(request('/stores/a/products'), second, vi.fn());
  finish.forEach(fn => fn());
  invalidateShortCache('/stores/a');
  second.json(['stale']);
  const next = vi.fn();
  cache(request('/stores/a/products'), response(), next);
  expect(next).toHaveBeenCalled();
});

it('combines concurrent identical reads, including reordered query parameters', () => {
  const cache = shortCache(); const leader = response(); const follower = response();
  const read = vi.fn(); const duplicate = vi.fn();
  cache(request('/stores/x/products?a=1&b=2'), leader, read);
  cache(request('/stores/x/products?b=2&a=1'), follower, duplicate);
  expect(read).toHaveBeenCalledOnce(); expect(duplicate).not.toHaveBeenCalled();
  leader.json(['shared']); expect(follower.json).toHaveBeenCalledWith(['shared']);
});
it('shares errors without caching them', () => {
  const cache = shortCache(); const leader = response(); const follower = response();
  cache(request('/stores/error'), leader, vi.fn()); cache(request('/stores/error'), follower, vi.fn());
  leader.statusCode = 500; leader.json({ error: 'failed' });
  expect(follower.statusCode).toBe(500); expect(follower.json).toHaveBeenCalledWith({ error: 'failed' });
  const retry = vi.fn(); cache(request('/stores/error'), response(), retry); expect(retry).toHaveBeenCalledOnce();
});
it('does not send invalidated leader stock to waiting customers', () => {
  const cache = shortCache(); const leader = response(); const follower = response(); const fresh = response();
  cache(request('/stores/churn/products'), leader, vi.fn()); cache(request('/stores/churn/products'), follower, vi.fn());
  invalidateInventoryCache('churn', false);
  const read = vi.fn(); cache(request('/stores/churn/products'), fresh, read); expect(read).toHaveBeenCalledOnce();
  fresh.json(['fresh']); leader.json(['stale']);
  expect(follower.statusCode).toBe(503);
  const hit = response(); cache(request('/stores/churn/products'), hit, vi.fn()); expect(hit.json).toHaveBeenCalledWith(['fresh']);
});
it('bounds waiters and releases disconnected followers', () => {
  const cache = shortCache(); const leader = response(); cache(request('/stores/hot'), leader, vi.fn());
  const callbacks: (() => void)[] = [];
  for (let i = 0; i < 1000; i++) {
    const follower = response(); follower.once = ((event: string, fn: () => void) => { if (event === 'close') callbacks.push(fn); return follower; }) as Response['once'];
    cache(request('/stores/hot'), follower, vi.fn());
  }
  const overflow = response(); cache(request('/stores/hot'), overflow, vi.fn()); expect(overflow.statusCode).toBe(503);
  callbacks.forEach(fn => fn());
  const follower = response(); cache(request('/stores/hot'), follower, vi.fn()); leader.json(['ok']); expect(follower.json).toHaveBeenCalledWith(['ok']);
});
it('shares equivalent coordinate spellings but never rounds different addresses', () => {
  const cache = shortCache(); const leader = response(); const follower = response();
  cache(request('/stores/nearest?lat=13.2700&lng=74.750'), leader, vi.fn());
  const duplicate=vi.fn();
  cache(request('/stores/nearest?lng=74.75&lat=13.27'), follower, duplicate);
  expect(duplicate).not.toHaveBeenCalled();
  leader.json(['exact']);expect(follower.json).toHaveBeenCalledWith(['exact']);
  const other=vi.fn();const different=response();
  cache(request('/stores/nearest?lat=13.27001&lng=74.75'),different,other);
  expect(other).toHaveBeenCalledOnce();different.json(['different']);
});
it('invalidates ranked search/category/popularity caches after inventory changes', () => {
 const cache = shortCache();
 for (const path of ['/browse/search?q=rice', '/browse/category?category=rice', '/browse/popular']) {
  const initial = response(); cache(request(path), initial, vi.fn()); initial.json(['old stock']);
  invalidateInventoryCache('shop', false);
  const next = vi.fn(); const fresh = response(); cache(request(path), fresh, next);
  expect(next).toHaveBeenCalledOnce(); fresh.json(['new stock']);
 }
});
