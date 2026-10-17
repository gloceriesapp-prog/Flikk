import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDraftSaveQueue } from '../../../apps/partner/src/onboarding/draftSaveQueue';

type Patch = { name?: string; phone?: string };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => { resolve = yes; });
  return { promise, resolve };
}
function fixture(save = vi.fn(async (_patch: Patch) => {})) {
  let epoch = 1;
  const onError = vi.fn();
  const queue = createDraftSaveQueue<Patch>({ epoch: () => epoch, save, onError });
  return { queue, save, onError, switchAccount() { epoch++; queue.reset(); } };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('does no network work on the Next press and coalesces quick step edits', async () => {
  const f = fixture();
  f.queue.enqueue({ name: 'First' });
  f.queue.enqueue({ name: 'Corrected', phone: 'fixture' });
  expect(f.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(350);
  expect(f.save).toHaveBeenCalledOnce();
  expect(f.save).toHaveBeenCalledWith({ name: 'Corrected', phone: 'fixture' });
});

it('serializes a newer edit behind a slow save instead of racing it', async () => {
  const slow = deferred();
  const save = vi.fn<(_: Patch) => Promise<void>>().mockReturnValueOnce(slow.promise).mockResolvedValue(undefined);
  const f = fixture(save);
  f.queue.enqueue({ name: 'Old' });
  await vi.advanceTimersByTimeAsync(350);
  f.queue.enqueue({ name: 'New' });
  await vi.advanceTimersByTimeAsync(350);
  expect(save).toHaveBeenCalledTimes(1);
  slow.resolve();
  await f.queue.flush();
  expect(save.mock.calls.map(([patch]) => patch)).toEqual([{ name: 'Old' }, { name: 'New' }]);
});

it('drains in-flight and queued edits before final submission can proceed', async () => {
  const slow = deferred();
  const save = vi.fn<(_: Patch) => Promise<void>>().mockReturnValueOnce(slow.promise).mockResolvedValue(undefined);
  const f = fixture(save);
  f.queue.enqueue({ name: 'Owner' });
  await vi.advanceTimersByTimeAsync(350);
  f.queue.enqueue({ phone: 'fixture' });
  const submit = vi.fn();
  const work = f.queue.flush().then(submit);
  await Promise.resolve();
  expect(submit).not.toHaveBeenCalled();
  slow.resolve();
  await work;
  expect(save).toHaveBeenCalledTimes(2);
  expect(submit).toHaveBeenCalledOnce();
});

it('drops unsent private draft fields on logout/account change', async () => {
  const f = fixture();
  f.queue.enqueue({ name: 'Private A' });
  f.switchAccount();
  f.queue.enqueue({ name: 'Account B' });
  await vi.advanceTimersByTimeAsync(350);
  expect(f.save).toHaveBeenCalledOnce();
  expect(f.save).toHaveBeenCalledWith({ name: 'Account B' });
});

it('a late old-account completion cannot clear a new account save', async () => {
  const old = deferred(); const current = deferred();
  const save = vi.fn<(_: Patch) => Promise<void>>().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const f = fixture(save);
  f.queue.enqueue({ name: 'A' });
  await vi.advanceTimersByTimeAsync(350);
  f.switchAccount();
  f.queue.enqueue({ name: 'B' });
  await vi.advanceTimersByTimeAsync(350);
  old.resolve();
  const done = vi.fn(); const work = f.queue.flush().then(done);
  await Promise.resolve(); await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  current.resolve(); await work;
  expect(done).toHaveBeenCalledOnce();
});

it('a failed best-effort save does not deadlock later saves or final submission', async () => {
  const save = vi.fn<(_: Patch) => Promise<void>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const f = fixture(save);
  f.queue.enqueue({ name: 'First' });
  await f.queue.flush();
  expect(f.onError).toHaveBeenCalledOnce();
  f.queue.enqueue({ name: 'Final' });
  await f.queue.flush();
  expect(save).toHaveBeenLastCalledWith({ name: 'Final' });
});
