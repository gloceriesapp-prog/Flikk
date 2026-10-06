import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { BoundedCache } from './boundedCache.js';
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
it('coalesces a burst of same-account reads and expires its cached role', async () => {
  const cache = new BoundedCache<number>(); const load = vi.fn(async () => 1);
  expect(await Promise.all(Array.from({ length: 50 }, () => cache.get('a', 30_000, load)))).toHaveLength(50);
  expect(load).toHaveBeenCalledTimes(1); await cache.get('a', 30_000, load); expect(load).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(30_000); await cache.get('a', 30_000, load); expect(load).toHaveBeenCalledTimes(2);
});
it('fresh writes do not join an older pending authorization read', async () => {
  const cache = new BoundedCache<number>(); const old = deferred<number>();
  const read = cache.get('a', 30_000, () => old.promise);
  const write = cache.get('a', 30_000, async () => 2, true);
  expect(await write).toBe(2); old.resolve(1); expect(await read).toBe(1); expect(cache.peek('a')).toBe(2);
});
it('does not repopulate a revoked user from a late lookup', async () => {
  const cache = new BoundedCache<number>(); const pending = deferred<number>();
  const request = cache.get('user:session', 30_000, () => pending.promise);
  cache.invalidate(key => key.startsWith('user:')); const rejected = expect(request).rejects.toMatchObject({ code: 'AUTH_CHANGED' }); pending.resolve(1); await rejected;
  expect(cache.peek('user:session')).toBeUndefined();
});
it('evicts least recently used values and bounds outstanding remote work', async () => {
  const cache = new BoundedCache<number>(2, 1);
  await cache.get('a', 100, async () => 1); await cache.get('b', 100, async () => 2);
  cache.peek('a'); await cache.get('c', 100, async () => 3); expect(cache.peek('b')).toBeUndefined();
  const pending = deferred<number>(); const first = cache.get('d', 100, () => pending.promise);
  cache.invalidate(key => key === 'd');
  await expect(cache.get('e', 100, async () => 4)).rejects.toMatchObject({ status: 503 });
  const rejected = expect(first).rejects.toMatchObject({ code: 'AUTH_CHANGED' }); pending.resolve(1); await rejected;
});

it('never extends snapshot validity by the duration of a slow lookup', async () => {
  const cache = new BoundedCache<number>(); const pending = deferred<number>();
  const request = cache.get('user', 30_000, () => pending.promise);
  const rejected = expect(request).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
  vi.advanceTimersByTime(30_001); pending.resolve(1); await rejected;
  expect(cache.peek('user')).toBeUndefined();
});
it('allows simultaneous fresh writes but invalidation rejects every in-flight snapshot', async () => {
  const cache = new BoundedCache<number>(); const first = deferred<number>(); const second = deferred<number>();
  const a = cache.get('user', 30_000, () => first.promise, true);
  const b = cache.get('user', 30_000, () => second.promise, true);
  const ra = expect(a).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
  const rb = expect(b).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
  cache.invalidate(key => key === 'user'); first.resolve(1); second.resolve(2);
  await Promise.all([ra, rb]); expect(cache.peek('user')).toBeUndefined();
});
