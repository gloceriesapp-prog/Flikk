import { expect, it, vi } from 'vitest';
vi.mock('../../../node_modules/expo-notifications', () => ({}));
import { createNotificationPermissionGate } from '../../../apps/partner/src/features/push-notifications/notificationPermission';
import { useNotificationStatusStore } from '../../../apps/partner/src/store/useNotificationStatusStore';

it('coalesces the first native permission prompt and respects a decline on later checks', async () => {
  let finish!: (value: { status: string }) => void;
  const read = vi.fn().mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  const request = vi.fn(() => new Promise<{ status: string }>(resolve => { finish = resolve; }));
  const ensure = createNotificationPermissionGate(read, request);
  const first = ensure();
  expect(ensure()).toBe(first);
  await Promise.resolve();
  expect(request).toHaveBeenCalledOnce();
  finish({ status: 'denied' });
  expect(await first).toEqual({ status: 'denied' });
  read.mockResolvedValue({ status: 'denied', canAskAgain: true });
  await ensure();
  expect(request).toHaveBeenCalledOnce();
});

it('does not prompt when already granted or permanently denied', async () => {
  const request = vi.fn();
  for (const permission of [{ status: 'granted' }, { status: 'denied', canAskAgain: false }]) {
    const ensure = createNotificationPermissionGate(async () => permission, request);
    expect(await ensure()).toEqual(permission);
  }
  expect(request).not.toHaveBeenCalled();
});

it('detects permission enabled from phone settings without another native prompt', async () => {
  const read = vi.fn().mockResolvedValueOnce({ status: 'denied' }).mockResolvedValueOnce({ status: 'granted' });
  const request = vi.fn();
  const ensure = createNotificationPermissionGate(read, request);
  expect((await ensure()).status).toBe('denied');
  expect((await ensure()).status).toBe('granted');
  expect(request).not.toHaveBeenCalled();
});

it('does not reopen a dismissed denial popup for the same foreground result', () => {
  const store = useNotificationStatusStore;
  store.setState({ status: 'unknown', dismissed: false });
  store.getState().setStatus('denied');
  store.getState().dismiss();
  store.getState().setStatus('denied');
  expect(store.getState().dismissed).toBe(true);
  store.getState().setStatus('ok');
  store.getState().setStatus('denied');
  expect(store.getState().dismissed).toBe(false);
});
