export interface InventorySignal {
  storeIds: string[];
  zoneIds: string[];
  storeChanged: boolean;
}
export interface InventoryScope { storeIds: string[]; zoneIds: string[] }
export type HomeEvent = { type: 'content' | 'settings' } | ({ type: 'inventory' } & InventorySignal)
  | { type: 'health'; healthy: boolean; recovery: boolean };

// Reverse indexes make delivery proportional to interested clients, not all
// connected customers. Zones are for store discovery, never product fan-out.
export class HomeBroker<T> {
  private clients = new Set<T>();
  private stores = new Map<string, Set<T>>();
  private zones = new Map<string, Set<T>>();
  add(client: T, scope: InventoryScope) {
    this.clients.add(client);
    for (const [index, ids] of [[this.stores, scope.storeIds], [this.zones, scope.zoneIds]] as const) {
      for (const id of new Set(ids)) {
        let set = index.get(id);
        if (!set) index.set(id, set = new Set());
        set.add(client);
      }
    }
    return () => {
      this.clients.delete(client);
      for (const [index, ids] of [[this.stores, scope.storeIds], [this.zones, scope.zoneIds]] as const) {
        for (const id of ids) { const set = index.get(id); set?.delete(client); if (!set?.size) index.delete(id); }
      }
    };
  }
  recipients(event: HomeEvent): Set<T> {
    if (event.type !== 'inventory') return new Set(this.clients);
    const result = new Set<T>();
    for (const id of event.storeIds) for (const client of this.stores.get(id) ?? []) result.add(client);
    if (event.storeChanged) for (const id of event.zoneIds) for (const client of this.zones.get(id) ?? []) result.add(client);
    return result;
  }
  get size() { return this.clients.size; }
}
export function parseScope(value: unknown, limit: number): string[] | null {
  if (value === undefined || value === '') return [];
  if (typeof value !== 'string') return null;
  const ids = [...new Set(value.split(','))];
  return ids.length <= limit && ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ? ids : null;
}
