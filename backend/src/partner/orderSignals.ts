export type OrderSignal = { type: 'orders_changed' } | { type: 'health'; healthy: boolean };
/** Server-owned store scopes. No client chooses which shop to subscribe to. */
export class StoreOrderSignals {
  private stores = new Map<string, Set<(event: OrderSignal) => void>>();
  subscribe(storeId: string, listener: (event: OrderSignal) => void): () => void {
    let listeners = this.stores.get(storeId);
    if (!listeners) this.stores.set(storeId, listeners = new Set());
    listeners.add(listener);
    let removed = false;
    return () => {
      if (removed) return;
      removed = true; listeners.delete(listener);
      if (!listeners.size && this.stores.get(storeId) === listeners) this.stores.delete(storeId);
    };
  }
  changed(storeIds: readonly unknown[]): void {
    for (const id of new Set(storeIds)) if (typeof id === 'string') {
      for (const listener of this.stores.get(id) ?? []) listener({ type: 'orders_changed' });
    }
  }
  health(healthy: boolean): void {
    for (const listeners of this.stores.values()) for (const listener of listeners) listener({ type: 'health', healthy });
  }
}
