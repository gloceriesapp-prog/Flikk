import { expect, it, vi } from 'vitest';
import { StoreOrderSignals } from './orderSignals.js';
it('notifies only the owning shop, deduplicating a store present in old and new rows', () => {
  const broker = new StoreOrderSignals(), first = vi.fn(), second = vi.fn();
  broker.subscribe('store-a', first); broker.subscribe('store-b', second);
  broker.changed(['store-a', 'store-a', null]);
  expect(first).toHaveBeenCalledOnce(); expect(first).toHaveBeenCalledWith({ type: 'orders_changed' });
  expect(second).not.toHaveBeenCalled();
});
it('supports concurrent devices in one shop and cleans up independently', () => {
  const broker = new StoreOrderSignals(), listeners = Array.from({ length: 100 }, () => vi.fn());
  const remove = listeners.map(listener => broker.subscribe('store-a', listener));
  remove[0]!(); remove[0]!(); broker.changed(['store-a']);
  expect(listeners[0]).not.toHaveBeenCalled();
  for (const listener of listeners.slice(1)) expect(listener).toHaveBeenCalledOnce();
  for (const stop of remove) stop(); broker.health(true);
  for (const listener of listeners.slice(1)) expect(listener).toHaveBeenCalledOnce();
});
it('resynchronizes every subscribed shop after a database reconnect without leaking order data', () => {
  const broker = new StoreOrderSignals(), a = vi.fn(), b = vi.fn();
  broker.subscribe('a', a); broker.subscribe('b', b); broker.health(true);
  expect(a).toHaveBeenCalledWith({ type: 'health', healthy: true });
  expect(b).toHaveBeenCalledWith({ type: 'health', healthy: true });
});
