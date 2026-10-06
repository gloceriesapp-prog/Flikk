import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionPolicy } from '../../../apps/customer/src/screens/home/content/connection';
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function setup(random = 0.5) {
  const refresh = vi.fn(); const connect = vi.fn();
  const policy = new ConnectionPolicy(refresh, connect, () => random);
  policy.start(); return { policy, refresh, connect };
}
describe('Foreground realtime recovery policy', () => {
  it('has no periodic fallback while upstream realtime is healthy', () => {
    const { policy, refresh } = setup();
    policy.pulse(true); vi.advanceTimersByTime(5000); refresh.mockClear();
    for (let i = 0; i < 20; i++) { policy.pulse(true); vi.advanceTimersByTime(20_000); }
    expect(refresh).not.toHaveBeenCalled(); policy.stop();
  });
  it('polls on upstream failure even when HTTP SSE is still connected', () => {
    const { policy, refresh, connect } = setup();
    policy.pulse(false); vi.advanceTimersByTime(59_999); expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(refresh).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1); policy.stop();
  });
  it('stops fallback on recovery and catches up once with jitter', () => {
    const { policy, refresh } = setup();
    vi.advanceTimersByTime(40_000); policy.pulse(true, true);
    vi.advanceTimersByTime(2999); expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(refresh).toHaveBeenCalledTimes(1);
    policy.pulse(true); vi.advanceTimersByTime(20_000); policy.pulse(true); vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(1); policy.stop();
  });
  it('coalesces repeated errors and cancels retries in background', () => {
    const { policy, refresh, connect } = setup();
    policy.failed(); policy.failed(); vi.advanceTimersByTime(1499); expect(connect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1); expect(connect).toHaveBeenCalledTimes(2);
    policy.failed(); vi.advanceTimersByTime(2999); expect(connect).toHaveBeenCalledTimes(2);
    policy.stop(); vi.advanceTimersByTime(200_000);
    expect(connect).toHaveBeenCalledTimes(2); expect(refresh).not.toHaveBeenCalled();
  });
  it('detects a silent stream through heartbeat expiry', () => {
    const { policy, connect } = setup();
    policy.pulse(true); vi.advanceTimersByTime(61_500);
    expect(connect).toHaveBeenCalledTimes(2); policy.stop();
  });
  it('staggered devices do not reconnect or poll in lockstep', () => {
    const a = setup(0); const b = setup(1);
    a.policy.failed(); b.policy.failed(); vi.advanceTimersByTime(1000);
    expect(a.connect).toHaveBeenCalledTimes(2); expect(b.connect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(44_000); expect(a.refresh).toHaveBeenCalled(); expect(b.refresh).not.toHaveBeenCalled();
    a.policy.stop(); b.policy.stop();
  });
});
