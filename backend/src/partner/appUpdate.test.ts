import { expect, it, vi } from 'vitest';
import { createUpdateController } from '../../../apps/partner/src/features/app-update/updateController';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  let time = 0;
  const client = {
    check: vi.fn(async () => ({ isAvailable: true })),
    download: vi.fn(async () => ({ isNew: true })),
    reload: vi.fn(async () => {}),
    now: () => time,
  };
  return { client, controller: createUpdateController(client), advance: () => { time += 60_000; } };
}

it('coalesces concurrent startup/foreground checks and downloads before allowing reload', async () => {
  const f = fixture();
  const pending = deferred<{ isNew: boolean }>();
  f.client.download.mockReturnValueOnce(pending.promise);
  const check = f.controller.check();
  expect(f.controller.check()).toBe(check);
  await vi.waitFor(() => expect(f.controller.getSnapshot()).toBe('downloading'));
  await f.controller.reload();
  expect(f.client.reload).not.toHaveBeenCalled();
  expect(f.controller.download()).toBe(f.controller.download());
  pending.resolve({ isNew: true });
  await check;
  expect(f.controller.getSnapshot()).toBe('ready');
  expect(f.client.check).toHaveBeenCalledOnce();
  expect(f.client.download).toHaveBeenCalledOnce();
});

it('keeps failed discovery non-blocking and bounds foreground polling', async () => {
  const f = fixture();
  f.client.check.mockRejectedValueOnce(new Error('offline'));
  await f.controller.check();
  await f.controller.check();
  expect(f.controller.getSnapshot()).toBe('idle');
  expect(f.client.check).toHaveBeenCalledOnce();
  f.advance();
  await f.controller.check();
  expect(f.controller.getSnapshot()).toBe('ready');
});

it('keeps a failed download blocking, without automatic retry loops, until manual retry succeeds', async () => {
  const f = fixture();
  f.client.download.mockRejectedValueOnce(new Error('connection lost'));
  await f.controller.check();
  expect(f.controller.getSnapshot()).toBe('download-error');
  f.controller.observeNative({ available: true, pending: false, downloading: false });
  f.advance();
  await f.controller.check();
  expect(f.client.download).toHaveBeenCalledOnce();
  await f.controller.download();
  expect(f.controller.getSnapshot()).toBe('ready');
});

it('recognizes an update downloaded by native startup without downloading again', async () => {
  const f = fixture();
  f.controller.observeNative({ pending: true, downloading: false, available: true });
  await f.controller.check();
  expect(f.controller.getSnapshot()).toBe('ready');
  expect(f.client.check).not.toHaveBeenCalled();
  expect(f.client.download).not.toHaveBeenCalled();
});

it('does not replace a native-confirmed ready update with a late fetch failure', async () => {
  const f = fixture();
  const pending = deferred<{ isNew: boolean }>();
  f.client.download.mockReturnValueOnce(pending.promise);
  const download = f.controller.download();
  await Promise.resolve();
  f.controller.observeNative({ pending: true, downloading: false, available: true });
  pending.reject(new Error('late request failure'));
  await download;
  expect(f.controller.getSnapshot()).toBe('ready');
});

it('shows interrupted native startup downloads as retryable failures', () => {
  const f = fixture();
  f.controller.observeNative({ pending: false, downloading: true, available: true });
  f.controller.observeNative({ pending: false, downloading: false, available: true, downloadError: new Error('offline') });
  expect(f.controller.getSnapshot()).toBe('download-error');
});

it('does not let a late fetch completion re-enable Reload App during a restart', async () => {
  const f = fixture();
  const pending = deferred<{ isNew: boolean }>();
  f.client.download.mockReturnValueOnce(pending.promise);
  const download = f.controller.download();
  await Promise.resolve();
  f.controller.observeNative({ pending: true, downloading: false, available: true });
  await f.controller.reload();
  pending.resolve({ isNew: true });
  await download;
  expect(f.controller.getSnapshot()).toBe('reloading');
});

it('coalesces reload presses and allows retry after a reload failure', async () => {
  const f = fixture();
  await f.controller.check();
  f.client.reload.mockRejectedValueOnce(new Error('restart failed'));
  const reload = f.controller.reload();
  expect(f.controller.reload()).toBe(reload);
  await reload;
  expect(f.controller.getSnapshot()).toBe('reload-error');
  f.controller.observeNative({ pending: true, downloading: false, available: true });
  expect(f.controller.getSnapshot()).toBe('reload-error');
  await f.controller.reload();
  expect(f.client.reload).toHaveBeenCalledTimes(2);
  expect(f.controller.getSnapshot()).toBe('reloading');
});

it('supports rollback directives and no longer blocks when the server has withdrawn an update', async () => {
  const download = vi.fn(async () => ({ isNew: false, isRollBackToEmbedded: true }));
  const controller = createUpdateController({
    check: async () => ({ isAvailable: false, isRollBackToEmbedded: true }), download,
    reload: async () => {}, now: Date.now,
  });
  await controller.check();
  expect(controller.getSnapshot()).toBe('ready');
  const f = fixture();
  f.client.download.mockResolvedValueOnce({ isNew: false });
  await f.controller.check();
  expect(f.controller.getSnapshot()).toBe('idle');
});
