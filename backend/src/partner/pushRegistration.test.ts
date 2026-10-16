import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), clear: vi.fn(), expo: vi.fn(), status: vi.fn(), listeners: [] as Array<(token: { type: string; data: string }) => void>, auth: { accessToken: 'account-a', clear: () => mocks.clear() } }));
vi.mock('../../../node_modules/expo-device', () => ({ isDevice: true }));
vi.mock('../../../node_modules/react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('../../../node_modules/expo', () => ({ isRunningInExpoGo: () => false }));
vi.mock('../../../node_modules/expo-constants', () => ({ default: { expoConfig: { extra: { eas: { projectId: 'project' } } } } }));
vi.mock('../../../node_modules/expo-notifications', () => ({
  AndroidImportance: { MAX: 5, DEFAULT: 3 }, AndroidNotificationVisibility: { PUBLIC: 1 },
  setNotificationChannelAsync: vi.fn().mockResolvedValue(null), getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: mocks.expo, addPushTokenListener: (listener: typeof mocks.listeners[number]) => { mocks.listeners.push(listener); return { remove: () => { mocks.listeners = mocks.listeners.filter(item => item !== listener); } }; },
}));
vi.mock('../../../apps/partner/src/api/auth', () => ({ savePushToken: mocks.save }));
vi.mock('../../../apps/partner/src/api/client', () => ({ apiRequest: mocks.remove }));
vi.mock('../../../apps/partner/src/store/useAuthStore', () => ({ useAuthStore: { getState: () => mocks.auth } }));
vi.mock('../../../apps/partner/src/store/useNotificationStatusStore', () => ({ useNotificationStatusStore: { getState: () => ({ setStatus: mocks.status }) } }));
vi.mock('../../../apps/partner/src/navigation/navigationRef', () => ({ navigationRef: { isReady: () => false } }));
import { logoutPartner, registerPushToken, watchPushTokenRotation } from '../../../apps/partner/src/features/push-notifications/registerPushToken';
import { resetSessionScope } from '../../../apps/partner/src/store/sessionScope';
const native = { type: 'android', data: 'native-a' };
beforeEach(() => { resetSessionScope(); vi.clearAllMocks(); mocks.clear.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined); mocks.listeners = []; mocks.auth.accessToken = 'account-a'; mocks.save.mockResolvedValue(undefined); mocks.expo.mockImplementation(async (options: { devicePushToken?: typeof native }) => {
  if (!options.devicePushToken) for (const listener of mocks.listeners) listener(native);
  return { data: `expo:${options.devicePushToken?.data ?? native.data}` };
}); });
it('bounds native callbacks emitted during token reads and coalesces foreground registration', async () => {
  watchPushTokenRotation();
  const first = registerPushToken(); expect(registerPushToken()).toBe(first); await first;
  expect(mocks.expo).toHaveBeenCalledTimes(2); expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.expo.mock.calls[1][0].devicePushToken).toEqual(native);
  await registerPushToken(); expect(mocks.save).toHaveBeenCalledTimes(1);
});

it('unregisters the saved device before clearing the session', async () => {
  await registerPushToken();
  const sequence: string[] = [];
  mocks.remove.mockImplementationOnce(async () => { sequence.push('remove'); });
  mocks.clear.mockImplementationOnce(async () => { sequence.push('clear'); });
  await logoutPartner();
  expect(sequence).toEqual(['remove', 'clear']);
  expect(mocks.remove).toHaveBeenCalledWith('/auth/push-token', expect.objectContaining({ method: 'DELETE', body: { token: 'expo:native-a' } }));
});

it('drains a registration and blocks fresh registration while logging out', async () => {
  let release!: () => void;
  mocks.save.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const registering = registerPushToken();
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const first = logoutPartner();
  expect(logoutPartner()).toBe(first);
  await registerPushToken({ type: 'android', data: 'rotation-during-logout' });
  expect(mocks.remove).not.toHaveBeenCalled();
  release(); await registering; await first;
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.remove).toHaveBeenCalledWith('/auth/push-token', expect.objectContaining({ body: { token: 'expo:native-a' } }));
});

it('keeps the session on unregister failure and allows retry', async () => {
  await registerPushToken();
  mocks.remove.mockRejectedValueOnce(new Error('offline'));
  await expect(logoutPartner()).rejects.toThrow('offline');
  expect(mocks.clear).not.toHaveBeenCalled();
  expect(mocks.auth.accessToken).toBe('account-a');
  await logoutPartner();
  expect(mocks.clear).toHaveBeenCalledTimes(1);
});

it('never clears a new account when old logout completes late', async () => {
  let release!: () => void;
  mocks.remove.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const pending = logoutPartner();
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  resetSessionScope(); mocks.auth.accessToken = 'account-b';
  release(); await pending;
  expect(mocks.clear).not.toHaveBeenCalled();
});

it('removes both tokens after an ambiguous failed rotation save', async () => {
  await registerPushToken();
  mocks.save.mockRejectedValueOnce(new Error('connection lost after POST'));
  await registerPushToken({ type: 'android', data: 'native-b' });
  await logoutPartner();
  expect(mocks.remove.mock.calls.map(call => call[1].body.token)).toEqual(['expo:native-b', 'expo:native-a']);
  expect(mocks.clear).toHaveBeenCalledTimes(1);
});
it('processes a real rotation that arrives during registration', async () => {
  watchPushTokenRotation(); let release!: () => void;
  mocks.save.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const pending = registerPushToken(); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  for (const listener of mocks.listeners) listener({ type: 'android', data: 'native-b' });
  release(); await pending;
  expect(mocks.save.mock.calls.map(call => call[0])).toEqual(['expo:native-a', 'expo:native-b']);
});
it('fences late token completion and obsolete rotation listeners after account change', async () => {
  watchPushTokenRotation(); let release!: (value: { data: string }) => void;
  mocks.expo.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const pending = registerPushToken(); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  resetSessionScope(); mocks.auth.accessToken = 'account-b'; release({ data: 'expo:old' }); await pending;
  expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.status).not.toHaveBeenCalled();
  for (const listener of mocks.listeners) listener(native);
  expect(mocks.expo).toHaveBeenCalledTimes(1);
  await registerPushToken(); expect(mocks.save).toHaveBeenCalledWith('expo:native-a');
});
