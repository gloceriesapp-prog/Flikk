/* eslint-disable @typescript-eslint/no-require-imports -- Native module factories must load mocks lazily. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as renderNative, waitFor } from '@testing-library/react-native';
import { LocationSearchScreen } from '../src/screens/location/LocationSearchScreen';

let mockLiveFix: { latitude: number; longitude: number; accuracy: number; timestamp: number } | null = null;
const mockReverse = jest.fn();
const mockGeocode = jest.fn();
const mockGetCamera = jest.fn();
const mockCoordinateForPoint = jest.fn();
const mockAnimateCamera = jest.fn();
const mockSetLocation = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockDeviceFix = jest.fn();
const mockRecentDeviceFix = jest.fn();
const mockAdoptDeviceFix = jest.fn();
const mockFetchAddresses = jest.fn();
const mockSetDefault = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('../src/api/addresses', () => ({ fetchAddresses: (...args: any[]) => mockFetchAddresses(...args), setDefaultAddress: (...args: any[]) => mockSetDefault(...args) }));

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));
jest.mock('../src/components/DismissKeyboardView', () => ({ DismissKeyboardView: ({ children }: any) => children }));
jest.mock('../src/location/useLiveLocation', () => ({ useLiveLocation: () => ({ fix: mockLiveFix, adoptDeviceFix: mockAdoptDeviceFix }) }));
jest.mock('../src/location/deviceLocation', () => ({ getRecentDeviceFix: () => mockRecentDeviceFix(), getDeviceLocationFix: (...args: any[]) => mockDeviceFix(...args) }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign((select: any) => select({ accessToken: 'test', exitGuestMode: jest.fn() }), { getState: () => ({ sessionEpoch: 1, customerId: 'customer' }) }) }));
jest.mock('../src/store/useLocationStore', () => ({ useLocationStore: (select: any) => select({ setLocation: mockSetLocation }) }));
jest.mock('../src/store/useRecentSearchesStore', () => ({ useRecentSearchesStore: (select: any) => select({ add: jest.fn() }) }));
jest.mock('../src/location/geocoding', () => ({
  reverseGeocode: (...args: any[]) => mockReverse(...args),
  requestLocationPermission: async () => false,
  searchPlaces: async () => [],
  geocodeAddress: (...args: any[]) => mockGeocode(...args),
  getCurrentCoordinates: async () => ({ latitude: 13.2, longitude: 74.7 }),
  distanceKm: () => 0,
  formatDistance: () => '',
}));
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Map = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ coordinateForPoint: mockCoordinateForPoint, animateCamera: mockAnimateCamera }));
    const create = Reflect.get(React, 'createElement');
    return create(View, { ...props, testID: 'map' });
  });
  Map.displayName = 'MockMap';
  return { __esModule: true, default: Map, Marker: View, Circle: View, PROVIDER_GOOGLE: 'google' };
});

function screen(params = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  return <QueryClientProvider client={client}><LocationSearchScreen navigation={{ navigate: mockNavigate, reset: mockReset, goBack: mockGoBack, canGoBack: mockCanGoBack, replace: mockReplace } as any}
    route={{ params, key: 'location', name: 'LocationSearch' } as any} /></QueryClientProvider>;
}
async function render(element: React.ReactElement) {
  const view = await renderNative(element);
  // The native map mounts only once its container has a real size.
  await fireEvent(view.getByTestId('map-area'), 'layout', { nativeEvent: { layout: { height: 800, width: 360, x: 0, y: 0 } } });
  return view;
}
async function settleTimers() {
  await act(async () => { jest.advanceTimersByTime(400); });
}
async function layoutAddressCard(view: Awaited<ReturnType<typeof render>>, height = 200) {
  await fireEvent(view.getByTestId('location-address-card'), 'layout', {
    nativeEvent: { layout: { height, width: 328, x: 16, y: 580 } },
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  mockLiveFix = null;
  mockRecentDeviceFix.mockReturnValue(null);
  mockFetchAddresses.mockResolvedValue([]);
  mockSetDefault.mockResolvedValue({ ok: true });
  mockDeviceFix.mockResolvedValue({ latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() });
  mockAdoptDeviceFix.mockImplementation(fix => { mockLiveFix = fix; return fix; });
  mockGeocode.mockResolvedValue(null);
  mockGetCamera.mockResolvedValue({ center: { latitude: 13.2, longitude: 74.7 } });
  mockCoordinateForPoint.mockImplementation(async () => (await mockGetCamera()).center);
  mockReverse.mockResolvedValue({ addressLabel: 'Real street, Kaup', shortName: 'Real street', city: 'Kaup', resolved: true });
});
afterEach(() => jest.useRealTimers());

it('returns to location choices when onboarding replaced the only stack route', async () => {
  mockCanGoBack.mockReturnValue(false);
  const view = await render(screen());
  await fireEvent.press(view.getByLabelText('Go back'));
  expect(mockReplace).toHaveBeenCalledWith('LocationPermission');
  expect(mockGoBack).not.toHaveBeenCalled();
});

it('preserves the previous screen when changing location from an existing stack', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByLabelText('Go back'));
  expect(mockGoBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('does not resolve or confirm the launch-zone placeholder before a real selection', async () => {
  const view = await render(screen());
  await fireEvent(view.getByTestId('map'), 'onMapReady');
  await settleTimers();
  expect(mockReverse).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).not.toHaveBeenCalled();
});

it('keeps the full address visible even when it is the same as the headline', async () => {
  mockReverse.mockResolvedValue({ addressLabel: 'Kaup', shortName: 'Kaup', city: '', resolved: true });
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  await fireEvent(view.getByTestId('map'), 'onMapReady');
  await settleTimers();
  expect(view.getAllByText('Kaup')).toHaveLength(2);
});

it('blocks unresolved addresses and allows retry for the same selected pin', async () => {
  mockReverse.mockResolvedValueOnce({ addressLabel: '', shortName: 'Pinned location', city: '', resolved: false });
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  await fireEvent(view.getByTestId('map'), 'onMapReady');
  await settleTimers();
  expect(view.getByText('13.20000, 74.70000')).toBeTruthy();
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).not.toHaveBeenCalled();
  await fireEvent.press(view.getByLabelText('Retry address lookup'));
  await settleTimers();
  expect(view.getByText('Real street, Kaup')).toBeTruthy();
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).toHaveBeenCalledWith({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup' });
});

it('ignores an older camera read that completes after a newer gesture', async () => {
  let resolveOld: (value: unknown) => void = () => {};
  mockGetCamera.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ center: { latitude: 13.3, longitude: 74.8 } });
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  const map = view.getByTestId('map');
  let oldEvent: Promise<void> = Promise.resolve();
  await act(async () => { oldEvent = map.props.onRegionChangeComplete({ latitude: 13.2, longitude: 74.7 }); });
  await fireEvent(map, 'onPanDrag');
  await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 }, { isGesture: true });
  await act(async () => { resolveOld({ center: { latitude: 13.2, longitude: 74.7 } }); await oldEvent; });
  await settleTimers();
  expect(mockReverse).toHaveBeenCalledTimes(1);
  expect(mockReverse).toHaveBeenCalledWith({ latitude: 13.3, longitude: 74.8 });
});

it('retains a verified pin after an unsuccessful search without blocking confirmation', async () => {
  const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup' }));
  const input = view.getByPlaceholderText('Search an area or address');
  await fireEvent.changeText(input, 'Unknown address');
  await fireEvent(input, 'onSubmitEditing');
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).toHaveBeenCalledWith({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup' });
});

it('does not starve an address request when the map reports minor GPS settling', async () => {
  let resolveAddress: (value: unknown) => void = () => {};
  mockReverse.mockImplementationOnce(() => new Promise(resolve => { resolveAddress = resolve; }));
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  const map = view.getByTestId('map');
  await fireEvent(map, 'onMapReady');
  await settleTimers();
  await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.20001, longitude: 74.7 });
  await act(async () => resolveAddress({ addressLabel: 'Real street, Kaup', shortName: 'Real street', city: 'Kaup', resolved: true }));
  expect(view.getByText('Real street, Kaup')).toBeTruthy();
  expect(mockReverse).toHaveBeenCalledTimes(1);
});

it('resolves a current-location action without waiting for a native settle and rejects an old animation target', async () => {
  // Permission is initially denied by the screen mock, so allow the explicit
  // action through its permission check for this test.
  const geocoding = require('../src/location/geocoding');
  const originalPermission = geocoding.requestLocationPermission;
  geocoding.requestLocationPermission = async () => true;
  try {
    mockGetCamera.mockResolvedValue({ center: { latitude: 13.3, longitude: 74.8 } });
    const view = await render(screen());
    await fireEvent.press(view.getByText('Use my current location'));
    await fireEvent(view.getByTestId('map'), 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 });
    await settleTimers();
    expect(mockReverse).toHaveBeenCalledTimes(1);
    expect(mockReverse).toHaveBeenCalledWith({ latitude: 13.2, longitude: 74.7 });
    expect(view.getByText('Real street, Kaup')).toBeTruthy();
    const target = mockAnimateCamera.mock.calls.at(-1)[0].center;
    expect(target).toEqual({ latitude: mockLiveFix!.latitude, longitude: mockLiveFix!.longitude });
    expect(view.getByTestId('device-location-marker').props.coordinate).toEqual(target);
    expect(view.getByTestId('live-location-pin').props.coordinate).toEqual(target);
    expect(view.queryByTestId('manual-location-pin')).toBeNull();
    expect(mockAdoptDeviceFix).toHaveBeenCalledTimes(1);
  } finally {
    geocoding.requestLocationPermission = originalPermission;
  }
});

it('does not recenter or reanchor the dot if the user pans during acquisition', async () => {
  const geocoding = require('../src/location/geocoding');
  const originalPermission = geocoding.requestLocationPermission;
  geocoding.requestLocationPermission = async () => true;
  let resolveFix!: (fix: unknown) => void;
  mockDeviceFix.mockImplementationOnce(() => new Promise(resolve => { resolveFix = resolve; }));
  try {
    const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup' }));
    const pending = fireEvent.press(view.getByText('Use my current location'));
    await waitFor(() => expect(mockDeviceFix).toHaveBeenCalledTimes(1));
    const map = view.getByTestId('map');
    await fireEvent(map, 'onPanDrag');
    mockGetCamera.mockResolvedValue({ center: { latitude: 13.3, longitude: 74.8 } });
    await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 }, { isGesture: true });
    await act(async () => {
      resolveFix({ latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() });
      await pending;
    });
    expect(mockAdoptDeviceFix).not.toHaveBeenCalled();
    expect(mockAnimateCamera).not.toHaveBeenCalled();
    await settleTimers();
    expect(mockReverse).toHaveBeenLastCalledWith({ latitude: 13.3, longitude: 74.8 });
  } finally {
    geocoding.requestLocationPermission = originalPermission;
  }
});

it('keeps the manually selected delivery pin when a later GPS update arrives', async () => {
  mockLiveFix = { latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() };
  const view = await render(screen());
  const map = view.getByTestId('map');
  await fireEvent(map, 'onMapReady');
  await fireEvent(map, 'onMapLoaded');
  await layoutAddressCard(view);
  await settleTimers();
  expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
  mockGetCamera.mockResolvedValue({ center: { latitude: 13.3, longitude: 74.8 } });
  await fireEvent(map, 'onPanDrag');
  await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 }, { isGesture: true });
  await settleTimers();
  mockLiveFix = { latitude: 13.2002, longitude: 74.7002, accuracy: 5, timestamp: Date.now() + 5000 };
  await view.rerender(screen());
  await settleTimers();
  expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).toHaveBeenCalledWith({ latitude: 13.3, longitude: 74.8, addressLabel: 'Real street, Kaup', city: 'Kaup' });
  expect(view.queryByTestId('live-location-pin')).toBeNull();
});

it('reuses a saved address at the confirmed map pin instead of creating a duplicate', async () => {
  mockFetchAddresses.mockResolvedValue([{ id: 'saved', latitude: 13.2, longitude: 74.7, is_default: true }]);
  const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup', intent: 'address-book' }));
  await fireEvent.press(view.getByText('Confirm Location'));
  await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  expect(mockSetDefault).toHaveBeenCalledWith('saved');
  expect(mockNavigate).not.toHaveBeenCalledWith('AddressForm', expect.anything());
});
it('opens the existing receiver-details form for a genuinely new pin', async () => {
  const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup', intent: 'address-book' }));
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockNavigate).toHaveBeenCalledWith('AddressForm', { latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup' });
  expect(mockSetDefault).not.toHaveBeenCalled();
});
it('does not create an address when the saved-address check fails', async () => {
  mockFetchAddresses.mockRejectedValue(new Error('offline'));
  const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Real street, Kaup', city: 'Kaup', intent: 'address-book' }));
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(view.getByText('Could not confirm this address. Please check your connection and try again.')).toBeTruthy();
});

it('covers the map until tiles render and uses a light native loading background', async () => {
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  expect(view.getByTestId('map').props.userInterfaceStyle).toBe('light');
  expect(view.getByTestId('map').props.loadingEnabled).toBe(true);
  expect(view.getByTestId('map-loading-cover')).toBeTruthy();
  await fireEvent(view.getByTestId('map'), 'onMapLoaded');
  expect(view.queryByTestId('map-loading-cover')).toBeNull();
});
it('offers a fresh native map instance when loading stalls', async () => {
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  await act(async () => { jest.advanceTimersByTime(10000); });
  await fireEvent.press(view.getByLabelText('Retry loading map'));
  expect(view.getByText('Loading map…')).toBeTruthy();
  expect(view.queryByLabelText('Retry loading map')).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockSetLocation).not.toHaveBeenCalled();
});


it('keeps the native live pin and confirmed coordinates on small GPS refinements without waiting for camera movement', async () => {
  mockLiveFix = { latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() };
  const view = await render(screen({ fromGps: true }));
  await fireEvent(view.getByTestId('map'), 'onMapReady');
  await fireEvent(view.getByTestId('map'), 'onMapLoaded');
  await layoutAddressCard(view);
  await settleTimers();
  mockLiveFix = { ...mockLiveFix, latitude: 13.20001, timestamp: Date.now() };
  await view.rerender(screen({ fromGps: true }));
  const target = { latitude: 13.20001, longitude: 74.7 };
  expect(view.getByTestId('live-location-pin').props.coordinate).toEqual(target);
  expect(view.getByTestId('device-location-marker').props.coordinate).toEqual(target);
  expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).toHaveBeenCalledWith(expect.objectContaining(target));
});

it('recenters immediately using a fresh native watch sample', async () => {
  const geo = require('../src/location/geocoding');
  const original = geo.requestLocationPermission;
  geo.requestLocationPermission = async () => true;
  mockRecentDeviceFix.mockReturnValue({ latitude: 13.2, longitude: 74.7, accuracy: 10, timestamp: Date.now() });
  try {
    const view = await render(screen());
    await fireEvent.press(view.getByText('Use my current location'));
    expect(mockDeviceFix).not.toHaveBeenCalled();
    expect(mockAdoptDeviceFix).toHaveBeenCalledWith(expect.objectContaining({ accuracy: 10 }));
  } finally { geo.requestLocationPermission = original; }
});

it('waits for rendered tiles and measured card layout before the first GPS camera command', async () => {
  mockLiveFix = { latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() };
  const view = await render(screen({ fromGps: true }));
  const map = view.getByTestId('map');
  await fireEvent(map, 'onMapReady');
  await settleTimers();
  expect(mockAnimateCamera).not.toHaveBeenCalled();
  await fireEvent(map, 'onMapLoaded');
  await settleTimers();
  expect(mockAnimateCamera).not.toHaveBeenCalled();
  await layoutAddressCard(view);
  await settleTimers();
  expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
  expect(mockAnimateCamera.mock.calls[0][0].center).toEqual({ latitude: 13.2, longitude: 74.7 });
});

it('recenters an unchanged GPS fix after the address card changes the visible map area', async () => {
  mockLiveFix = { latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() };
  const view = await render(screen({ fromGps: true }));
  const map = view.getByTestId('map');
  await fireEvent(map, 'onMapReady');
  await fireEvent(map, 'onMapLoaded');
  await layoutAddressCard(view);
  await settleTimers();
  mockAnimateCamera.mockClear();
  await layoutAddressCard(view, 260);
  await settleTimers();
  expect(mockAnimateCamera).toHaveBeenCalledTimes(1);
  expect(mockAnimateCamera.mock.calls[0][0].center).toEqual({ latitude: 13.2, longitude: 74.7 });
});

it('selects the coordinate under the visible pin instead of the provider camera centre', async () => {
  const pin = { latitude: 13.3001, longitude: 74.8001 };
  mockCoordinateForPoint.mockResolvedValue(pin);
  const view = await render(screen({ latitude: 13.2, longitude: 74.7 }));
  await layoutAddressCard(view);
  const map = view.getByTestId('map');
  await fireEvent(map, 'onPanDrag');
  await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 });
  await settleTimers();
  expect(mockCoordinateForPoint).toHaveBeenCalledWith({ x: 180, y: 284 });
  expect(mockReverse).toHaveBeenLastCalledWith(pin);
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).toHaveBeenCalledWith(expect.objectContaining(pin));
});

it('blocks confirmation if the native map cannot project the selected pin', async () => {
  mockCoordinateForPoint.mockRejectedValue(new Error('native view unavailable'));
  const view = await render(screen({ latitude: 13.2, longitude: 74.7, addressLabel: 'Old address' }));
  const map = view.getByTestId('map');
  await fireEvent(map, 'onPanDrag');
  await fireEvent(map, 'onRegionChangeComplete', { latitude: 13.3, longitude: 74.8 });
  expect(view.getByText('Couldn’t read this spot. Move the map slightly or use your current location.')).toBeTruthy();
  await fireEvent.press(view.getByText('Confirm Location'));
  expect(mockSetLocation).not.toHaveBeenCalled();
});

it('resets Apple Maps altitude as well as Google Maps zoom when recentering', async () => {
  const geo = require('../src/location/geocoding');
  const original = geo.requestLocationPermission;
  geo.requestLocationPermission = async () => true;
  try {
    const view = await render(screen());
    await fireEvent.press(view.getByText('Use my current location'));
    expect(mockAnimateCamera).toHaveBeenLastCalledWith(expect.objectContaining({
      altitude: 300, zoom: 18.5, pitch: 0, heading: 0,
    }), expect.anything());
  } finally { geo.requestLocationPermission = original; }
});

it('supplies an ordered zoom range so Google Maps iOS cannot receive min 14 and default max 0', async () => {
  const view = await render(screen());
  const { minZoomLevel, maxZoomLevel } = view.getByTestId('map').props;
  expect(minZoomLevel).toBe(14);
  expect(maxZoomLevel).toBe(21);
  expect(maxZoomLevel).toBeGreaterThan(minZoomLevel);
});

it('keeps one live halo without overlapping accuracy circles for precise GPS fixes', async () => {
  mockLiveFix = { latitude: 13.2, longitude: 74.7, accuracy: 5, timestamp: Date.now() };
  const view = await render(screen({ fromGps: true }));
  expect(view.queryByTestId('device-location-accuracy')).toBeNull();
  expect(view.getByTestId('device-location-marker').props.coordinate).toEqual({ latitude: 13.2, longitude: 74.7 });
  expect(view.getByTestId('device-location-halo')).toBeTruthy();
  expect(view.getByTestId('device-location-marker').props.tracksViewChanges).toBe(true);
  await fireEvent(view.getByTestId('device-location-halo'), 'layout', {
    nativeEvent: { layout: { width: 64, height: 64, x: 0, y: 0 } },
  });
  await settleTimers();
  expect(view.getByTestId('device-location-marker').props.tracksViewChanges).toBe(false);
  mockLiveFix = { ...mockLiveFix!, latitude: 13.21, timestamp: Date.now() };
  await view.rerender(screen({ fromGps: true }));
  expect(view.getByTestId('device-location-marker').props.coordinate.latitude).toBe(13.21);
  expect(view.getByTestId('device-location-marker').props.tracksViewChanges).toBe(false);
  mockLiveFix = null;
  await view.rerender(screen({ fromGps: true }));
  expect(view.queryByTestId('device-location-accuracy')).toBeNull();
  expect(view.queryByTestId('device-location-halo')).toBeNull();
});
