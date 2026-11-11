import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { onlineStore } from '../src/network/online';
import { useBackgroundUpdates } from '../src/features/app-updates/useBackgroundUpdates';

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(async () => ({ isAvailable: true, isRollBackToEmbedded: false })),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
  reloadAsync: jest.fn(),
}));

it('waits for active connectivity, downloads without reloading and cleans up lifecycle observers', async () => {
  jest.useFakeTimers();
  const previousDev = __DEV__;
  const state = Object.getOwnPropertyDescriptor(AppState, 'currentState');
  const remove = jest.fn();
  const subscribe = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
  Object.defineProperty(global, '__DEV__', { value: false, configurable: true });
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  onlineStore.setOnline(false);
  try {
    const hook = await renderHook(useBackgroundUpdates);
    await act(async () => { jest.advanceTimersByTime(20_000); });
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    await act(async () => { onlineStore.setOnline(true); jest.advanceTimersByTime(20_000); });
    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
    await hook.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  } finally {
    subscribe.mockRestore();
    if (state) Object.defineProperty(AppState, 'currentState', state);
    Object.defineProperty(global, '__DEV__', { value: previousDev, configurable: true });
    onlineStore.setOnline(true);
    jest.useRealTimers();
  }
});
