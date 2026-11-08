import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useHomeLocationRefresh } from '../src/location/useHomeLocationRefresh';
import { useLocationStore, type DeliveryLocation } from '../src/store/useLocationStore';
const mockFix = jest.fn();
const mockReverse = jest.fn();
const mockAddresses = jest.fn();
jest.mock('../src/location/deviceLocation', () => ({ ...jest.requireActual('../src/location/deviceLocation'), getDeviceLocationFix: (...args: unknown[]) => mockFix(...args) }));
jest.mock('../src/location/geocoding', () => ({ reverseGeocode: (...args: unknown[]) => mockReverse(...args) }));
jest.mock('../src/api/addresses', () => ({ fetchAddresses: () => mockAddresses() }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: { getState: () => ({ accessToken: 'test' }) } }));
jest.mock('../src/features/account-session/accountCache', () => ({ accountQueryClient: () => ({ resetQueries: jest.fn(async () => {}) }) }));
jest.mock('expo-location', () => ({ getForegroundPermissionsAsync: jest.fn(), hasServicesEnabledAsync: jest.fn() }));
const old: DeliveryLocation = { latitude: 13.2, longitude: 74.7, addressLabel: 'Previous area', city: 'Kaup', source: 'device' };
let changeState: (state: AppStateStatus) => void;
function emit(state: AppStateStatus) {
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
  changeState(state);
}
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => { changeState = listener; return { remove: jest.fn() }; });
  useLocationStore.setState({ location: { ...old }, isHydrated: true });
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as Location.LocationPermissionResponse);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  mockFix.mockImplementation(async () => ({ latitude: 13.21, longitude: 74.71, accuracy: 10, timestamp: Date.now() }));
  mockReverse.mockResolvedValue({ addressLabel: 'Current street', city: 'Udupi', resolved: true });
  mockAddresses.mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());
it('refreshes the real coordinates and address together when Home opens', async () => {
  await renderHook(() => useHomeLocationRefresh(true));
  await waitFor(() => expect(useLocationStore.getState().location).toEqual({ latitude: 13.21, longitude: 74.71, addressLabel: 'Current street', city: 'Udupi', source: 'device' }));
  expect(mockFix).toHaveBeenCalledWith({ fresh: true });
});
it('leaves an explicitly selected address fixed', async () => {
  useLocationStore.setState({ location: { ...old, source: 'manual' } });
  await renderHook(() => useHomeLocationRefresh(true));
  expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
});
it('protects a saved delivery address from a legacy install', async () => {
  useLocationStore.setState({ location: { ...old, source: undefined } });
  mockAddresses.mockResolvedValue([{ id: 'saved', latitude: old.latitude, longitude: old.longitude }]);
  await renderHook(() => useHomeLocationRefresh(true));
  await waitFor(() => expect(useLocationStore.getState().location?.source).toBe('manual'));
  expect(mockFix).not.toHaveBeenCalled();
});
it('migrates an old ambient pin to current device location', async () => {
  useLocationStore.setState({ location: { ...old, source: undefined } });
  await renderHook(() => useHomeLocationRefresh(true));
  await waitFor(() => expect(useLocationStore.getState().location?.addressLabel).toBe('Current street'));
});
it.each(['denied', 'approximate', 'services off', 'stale fix', 'unresolved address'])('keeps the previous pin when %s', async reason => {
  if (reason === 'denied') jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as Location.LocationPermissionResponse);
  if (reason === 'approximate') jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted', ios: { accuracy: 'reduced' } } as Location.LocationPermissionResponse);
  if (reason === 'services off') jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);
  if (reason === 'stale fix') mockFix.mockResolvedValue({ latitude: 13.21, longitude: 74.71, accuracy: 10, timestamp: Date.now() - 60_000 });
  if (reason === 'unresolved address') mockReverse.mockResolvedValue({ addressLabel: '', city: '', resolved: false });
  await renderHook(() => useHomeLocationRefresh(true));
  await act(async () => {});
  expect(useLocationStore.getState().location).toEqual(old);
});
it('ignores GPS jitter', async () => {
  const selected = useLocationStore.getState().location;
  mockFix.mockImplementation(async () => ({ ...old, latitude: old.latitude + 0.00001, accuracy: 10, timestamp: Date.now() }));
  await renderHook(() => useHomeLocationRefresh(true));
  await act(async () => {});
  expect(mockReverse).not.toHaveBeenCalled();
  expect(useLocationStore.getState().location).toBe(selected);
});
it('discards a late result after the user selects another address', async () => {
  let finish!: (value: unknown) => void;
  mockReverse.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await renderHook(() => useHomeLocationRefresh(true));
  await waitFor(() => expect(mockReverse).toHaveBeenCalled());
  const chosen = { ...old, addressLabel: 'Chosen home', source: 'manual' as const };
  await act(async () => { useLocationStore.setState({ location: chosen }); finish({ addressLabel: 'Too late', city: 'Other' }); });
  expect(useLocationStore.getState().location).toBe(chosen);
});
it('discards a background result and acquires again on resume', async () => {
  let finish!: (value: unknown) => void;
  mockFix.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await renderHook(() => useHomeLocationRefresh(true));
  await waitFor(() => expect(mockFix).toHaveBeenCalledTimes(1));
  await act(async () => { emit('background'); emit('active'); finish({ latitude: 14, longitude: 75, accuracy: 10, timestamp: Date.now() }); });
  await waitFor(() => expect(useLocationStore.getState().location?.addressLabel).toBe('Current street'));
  expect(mockFix).toHaveBeenCalledTimes(2);
  expect(mockReverse).toHaveBeenCalledTimes(1);
  expect(useLocationStore.getState().location?.latitude).toBe(13.21);
});
it('does no location work outside Home or before hydration', async () => {
  const hook = await renderHook<void, { enabled: boolean }>(({ enabled }) => useHomeLocationRefresh(enabled), { initialProps: { enabled: false } });
  await act(async () => { useLocationStore.setState({ isHydrated: false }); });
  await hook.rerender({ enabled: true });
  expect(mockFix).not.toHaveBeenCalled();
});
