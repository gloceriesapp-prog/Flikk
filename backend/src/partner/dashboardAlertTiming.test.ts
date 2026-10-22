import { expect, it } from 'vitest';
import { acceptanceWindow, dueAlert } from '../../../apps/partner-dashboard/src/features/order-alerts/alertTiming';

const order = { id: 'one', status: 'placed', placed_at: new Date(0).toISOString(), store_visible_at: new Date(100_000).toISOString(), acceptance_deadline_at: new Date(160_000).toISOString() };
it('uses server visibility and deadline, not checkout creation time', () => {
  expect(acceptanceWindow(order)).toEqual({ start: 100_000, deadline: 160_000 });
});
it('alerts on arrival, at 25 seconds and with 5 seconds remaining, once each', () => {
  const consumed = new Set<string>();
  for (const [at, key] of [[100_000, 'arrival'], [125_000, 'reminder'], [155_000, 'final']] as const) {
    const cue = dueAlert(order, at, consumed)!;
    expect(cue.consume).toContain(`one:${key}`);
    cue.consume.forEach(value => consumed.add(value));
    expect(dueAlert(order, at, consumed)).toBeNull();
  }
});
it('does not alert early, after timeout, or for acknowledged/terminal orders', () => {
  expect(dueAlert(order, 99_999, new Set())).toBeNull();
  expect(dueAlert(order, 160_000, new Set())).toBeNull();
  expect(dueAlert({ ...order, accepted_at: new Date(120_000).toISOString() }, 125_000, new Set())).toBeNull();
  expect(dueAlert({ ...order, status: 'cancelled' }, 125_000, new Set())).toBeNull();
});
it('coalesces missed stages into one cue on reconnect instead of a playback burst', () => {
  expect(dueAlert(order, 156_000, new Set())?.consume).toEqual(['one:arrival', 'one:reminder', 'one:final']);
});
it('honours a 50-second server window and its final cue at 45 seconds', () => {
  const short = { ...order, acceptance_deadline_at: new Date(150_000).toISOString() };
  expect(dueAlert(short, 145_000, new Set(['one:arrival', 'one:reminder']))?.consume).toContain('one:final');
});
it('uses a one-minute fallback only if older servers omit the deadline', () => {
  expect(acceptanceWindow({ ...order, acceptance_deadline_at: null })).toEqual({ start: 100_000, deadline: 160_000 });
});
it('rejects invalid timestamps and inverted windows', () => {
  expect(acceptanceWindow({ ...order, store_visible_at: 'bad' })).toBeNull();
  expect(acceptanceWindow({ ...order, acceptance_deadline_at: new Date(90_000).toISOString() })).toBeNull();
});

it('coalesces concurrent queue polls and skips full reads for an unchanged digest', async () => {
  const { createQueueReader } = await import('../../../apps/partner-dashboard/src/features/order-alerts/queueReader');
  let version = 'v1'; let reads = 0;
  const read = createQueueReader(async () => ({ version, hasMore: false }), async () => { reads++; return [version]; });
  expect(await Promise.all([read(), read()])).toEqual([['v1'], ['v1']]);
  await read(); expect(reads).toBe(1);
  version = 'v2'; expect(await read()).toEqual(['v2']); expect(reads).toBe(2);
});
