import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useInstalledUpiApps } from '../src/payments/useInstalledUpiApps';
import { detectInstalledUpiApps } from '../src/payments/installedUpiApps';
import { UPI_APPS } from '../src/payments/upiApps';
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('../src/payments/installedUpiApps', () => ({ detectInstalledUpiApps: jest.fn() }));
let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client }, children);
beforeEach(() => { jest.clearAllMocks(); mockFocused = true; client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() }); });
afterEach(() => { client.clear(); jest.restoreAllMocks(); });
test('retries discovery without hiding a native update requirement', async () => {
  jest.mocked(detectInstalledUpiApps).mockRejectedValueOnce(new Error('Update the native app')).mockResolvedValueOnce([UPI_APPS[0]!]);
  const hook = await renderHook(() => useInstalledUpiApps(), { wrapper });
  await waitFor(() => expect(hook.result.current.error).toBe('Update the native app'));
  await act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.apps[0]?.id).toBe('gpay'));
  expect(hook.result.current.error).toBe('');
});
test('refreshes installed apps after returning from another app', async () => {
  let change: (state: AppStateStatus) => void = () => {};
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => { change = listener; return { remove: jest.fn() }; });
  jest.mocked(detectInstalledUpiApps).mockResolvedValue([]);
  const hook = await renderHook(() => useInstalledUpiApps(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(() => { change('active'); });
  expect(detectInstalledUpiApps).toHaveBeenCalledTimes(2);
  hook.unmount(); spy.mockRestore();
});
test('does not discover payment apps on an unfocused screen', async () => {
  mockFocused = false;
  await renderHook(() => useInstalledUpiApps(), { wrapper });
  expect(detectInstalledUpiApps).not.toHaveBeenCalled();
});
