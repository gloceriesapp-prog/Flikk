import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ changed: null as null | ((payload: { new: object; old: object }) => void), remove: vi.fn(), channels: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  channel: () => { db.channels(); const channel = {
    on: (_event: unknown, _scope: unknown, callback: typeof db.changed) => { db.changed = callback; return channel; },
    subscribe: (callback: (status: string) => void) => { callback('SUBSCRIBED'); return channel; },
  }; return channel; },
  removeChannel: db.remove,
} }));
import { attachPartnerOrderStream, stopPartnerOrderStreams } from './orderStream.js';
class Client extends EventEmitter {
  destroyed = false; writableEnded = false; frames: string[] = []; headers: unknown; backpressure = false;
  status() { return this; } set(headers: unknown) { this.headers = headers; return this; } flushHeaders() {}
  write(frame: string) { this.frames.push(frame); return !this.backpressure; }
  end() { if (!this.writableEnded) { this.writableEnded = true; this.emit('close'); } }
  destroy() { this.destroyed = true; this.end(); }
}
const req = { ip: 'shared-mobile-network', socket: { setTimeout() {}, setKeepAlive() {} } } as unknown as Request;
function connect(store: string) { const res = new Client(); attachPartnerOrderStream(req, res as unknown as Response, store); return res; }
const changes = (client: Client) => client.frames.filter(frame => frame.includes('orders_changed'));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); db.remove.mockResolvedValue('ok'); });
afterEach(async () => { await stopPartnerOrderStreams(); vi.useRealTimers(); });
it('uses one database subscription and coalesces concurrent order writes per owning store', () => {
  const a = connect('shop-a'), b = connect('shop-b');
  for (let i = 0; i < 200; i++) db.changed!({ new: { store_id: 'shop-a', customer_id: 'private-customer' }, old: { store_id: 'shop-a' } });
  vi.advanceTimersByTime(75);
  expect(db.channels).toHaveBeenCalledOnce(); expect(changes(a)).toHaveLength(1); expect(changes(b)).toHaveLength(0);
  expect(a.frames.join('')).not.toContain('private-customer');
  expect(a.headers).toMatchObject({ 'Cache-Control': 'private, no-store, no-transform', 'X-Accel-Buffering': 'no' });
});
it('expires streams so permissions are rechecked and releases the database subscription', () => {
  const a = connect('shop-a'); vi.advanceTimersByTime(55000);
  expect(a.writableEnded).toBe(true); expect(db.remove).toHaveBeenCalledOnce();
});
it('disconnects slow clients instead of buffering unbounded updates', () => {
  const a = connect('shop-a'); a.backpressure = true;
  db.changed!({ new: { store_id: 'shop-a' }, old: {} }); vi.advanceTimersByTime(75);
  expect(a.destroyed).toBe(true); expect(db.remove).toHaveBeenCalledOnce();
});
