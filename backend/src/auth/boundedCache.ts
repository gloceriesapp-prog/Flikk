import { AppError } from '../lib/errors.js';
// LRU/TTL cache with single-flight misses. Invalidation removes in-flight
// work too, so a late pre-revocation lookup cannot repopulate the cache.
export class BoundedCache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  private activeLoads = 0;
  private loads = new Map<string, Set<{ valid: boolean }>>();
  private pending = new Map<string, Promise<T>>();
  constructor(private capacity = 50_000, private maxPending = 1000) {}
  peek(key: string): T | undefined {
    const entry = this.values.get(key);
    if (!entry) return;
    if (entry.expires <= Date.now()) { this.values.delete(key); return; }
    this.values.delete(key); this.values.set(key, entry);
    return entry.value;
  }
  async get(key: string, ttl: number, load: () => Promise<T>, fresh = false): Promise<T> {
    if (fresh) { this.values.delete(key); this.pending.delete(key); }
    if (!fresh) { const cached = this.peek(key); if (cached !== undefined) return cached; }
    const pending = this.pending.get(key);
    if (pending) return pending;
    if (this.activeLoads >= this.maxPending) throw new AppError(503, 'AUTH_BUSY', 'Authentication is busy. Please retry.');
    const expires = Date.now() + ttl;
    this.activeLoads += 1;
    const work = Promise.resolve().then(load);
    this.pending.set(key, work);
    const tickets = this.loads.get(key) ?? new Set<{ valid: boolean }>();
    this.loads.set(key, tickets);
    const ticket = { valid: true }; tickets.add(ticket);
    try {
      const value = await work;
      if (!ticket.valid || expires <= Date.now()) throw new AppError(503, 'AUTH_CHANGED', 'Authorization changed during verification. Please retry.');
      if (this.pending.get(key) === work) {
        if (this.values.size >= this.capacity) this.values.delete(this.values.keys().next().value!);
        this.values.set(key, { value, expires });
      }
      return value;
    } finally {
      this.activeLoads -= 1;
      tickets.delete(ticket);
      if (!tickets.size && this.loads.get(key) === tickets) this.loads.delete(key);
      if (this.pending.get(key) === work) this.pending.delete(key);
    }
  }
  invalidate(matches: (key: string) => boolean) {
    for (const key of this.values.keys()) if (matches(key)) this.values.delete(key);
    for (const [key, tickets] of this.loads) if (matches(key)) for (const ticket of tickets) ticket.valid = false;
    for (const key of this.pending.keys()) if (matches(key)) this.pending.delete(key);
  }
}
