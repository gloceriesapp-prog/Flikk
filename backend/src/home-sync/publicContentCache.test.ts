import { beforeEach, expect, it, vi } from 'vitest';
import type { QueryClient } from '../../../apps/customer/node_modules/@tanstack/react-query';
const fixture = vi.hoisted(() => ({ listeners: new Set<(event: string, inventory?: { refresh?: boolean }) => void>(), stops: vi.fn(), inventory: vi.fn() }));
vi.mock('../../../apps/customer/src/screens/home/content/realtime', () => ({ subscribeHomeContent: (listener: (event: string) => void) => {
  fixture.listeners.add(listener); return () => { fixture.listeners.delete(listener); fixture.stops(); };
} }));
vi.mock('../../../apps/customer/src/screens/home/content/inventoryCache', () => ({ invalidateInventory: fixture.inventory }));
import { subscribePublicContentCache } from '../../../apps/customer/src/screens/home/content/publicContentCache';
function client() { return { invalidateQueries: vi.fn() } as unknown as QueryClient; }
function emit(event: string, inventory?: { refresh?: boolean }) { for (const listener of fixture.listeners) listener(event, inventory); }
beforeEach(() => { vi.clearAllMocks(); expect(fixture.listeners.size).toBe(0); });
it('shares one content/settings observer across root and multiple mounted Home shelves', () => {
  const cache = client(); const root = subscribePublicContentCache(cache); const home = subscribePublicContentCache(cache);
  expect(fixture.listeners.size).toBe(1);
  emit('content');
  expect(cache.invalidateQueries).toHaveBeenCalledTimes(2); expect(fixture.inventory).toHaveBeenCalledTimes(1);
  root(); root(); expect(fixture.listeners.size).toBe(1);
  home(); expect(fixture.listeners.size).toBe(0); expect(fixture.stops).toHaveBeenCalledTimes(1);
});
it('detaches account-A observers and invalidates only the new account client after a swap', () => {
  const a = client(); const b = client(); const stopA = subscribePublicContentCache(a);
  const stopB = subscribePublicContentCache(b); stopA();
  emit('settings');
  expect(a.invalidateQueries).not.toHaveBeenCalled(); expect(b.invalidateQueries).toHaveBeenCalledTimes(2);
  stopB();
});
it('does not duplicate a recovery inventory refresh or invalidate config twice', () => {
  const cache = client(); const stop = subscribePublicContentCache(cache);
  emit('content', { refresh: true }); expect(fixture.inventory).not.toHaveBeenCalled();
  const contentPredicate = vi.mocked(cache.invalidateQueries).mock.calls[1][0]?.predicate;
  expect(contentPredicate?.({ queryKey: ['app-config'] } as never)).toBe(false);
  emit('config'); expect(cache.invalidateQueries).toHaveBeenCalledTimes(3);
  stop();
});
