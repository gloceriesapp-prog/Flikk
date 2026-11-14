import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openOrderStream, type OrderStreamTransport } from '../../../apps/partner/src/features/incoming-order-alert/orderStream';
class Transport implements OrderStreamTransport {
  responseText = ''; readyState = 3; status = 200;
  onprogress: (() => void) | null = null; onreadystatechange: (() => void) | null = null;
  onerror: (() => void) | null = null; ontimeout: (() => void) | null = null;
  open = vi.fn(); setRequestHeader = vi.fn(); send = vi.fn(); abort = vi.fn();
  append(text: string) { this.responseText += text; this.onprogress?.(); }
}
function fixture() {
  const transport = new Transport(), changed = vi.fn(), health = vi.fn(), ended = vi.fn();
  const stop = openOrderStream({ url: 'https://api.example.com/partner/orders/events', accessToken: 'test-session',
    createTransport: () => transport, onChange: changed, onHealth: health, onEnd: ended });
  return { transport, changed, health, ended, stop };
}
beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
it('uses header authentication and parses split frames without treating heartbeat or unknown data as orders', () => {
  const f = fixture();
  expect(f.transport.open).toHaveBeenCalledWith('GET', 'https://api.example.com/partner/orders/events');
  expect(f.transport.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer test-session');
  f.transport.append('data: {"type":"orders_'); expect(f.changed).not.toHaveBeenCalled();
  f.transport.append('changed"}\n\n: heartbeat\n\ndata: {"type":"unknown"}\n\n');
  expect(f.changed).toHaveBeenCalledOnce(); f.stop();
});
it('refreshes on healthy connection recovery and stops old-session callbacks after cleanup', () => {
  const f = fixture(); f.transport.append('data: {"type":"health","healthy":true}\r\n\r\n');
  expect(f.health).toHaveBeenCalledWith(true); expect(f.changed).toHaveBeenCalledOnce();
  f.stop(); f.transport.append('data: {"type":"orders_changed"}\n\n');
  expect(f.changed).toHaveBeenCalledOnce(); expect(f.ended).not.toHaveBeenCalled(); expect(f.transport.abort).toHaveBeenCalledOnce();
});
it('fails closed on unsupported endpoints and stale connections so polling can recover', () => {
  const f = fixture(); f.transport.status = 404; f.transport.onreadystatechange?.();
  expect(f.ended).toHaveBeenCalledOnce(); expect(f.changed).not.toHaveBeenCalled();
  const stalled = fixture(); vi.advanceTimersByTime(45000); expect(stalled.ended).toHaveBeenCalledOnce();
});
it('bounds streaming response memory rather than retaining an unbounded connection', () => {
  const f = fixture(); f.transport.append('x'.repeat(262145)); expect(f.ended).toHaveBeenCalledOnce();
});
