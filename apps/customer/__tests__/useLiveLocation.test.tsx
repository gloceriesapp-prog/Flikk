import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLiveLocation } from '../src/location/useLiveLocation';
import type { RawFix } from '../src/location/locationFilter';

const mockAcquire = jest.fn();
const mockRemember = jest.fn();
jest.mock('../src/location/deviceLocation', () => ({
  ...jest.requireActual('../src/location/deviceLocation'),
  getDeviceLocationFix: () => mockAcquire(), rememberDeviceFix: (...args: unknown[]) => mockRemember(...args),
}));
let watch: (value: Location.LocationObject) => void;
const remove = jest.fn();
function raw(northMeters = 0, age = 0): RawFix {
  return { latitude: 13.2 + northMeters / 111320, longitude: 74.7, accuracy: 10,
    timestamp: Date.now() - age, speed: 0 };
}
function emit(fix: RawFix) {
  watch({ timestamp: fix.timestamp, coords: { ...fix, altitude: null, altitudeAccuracy: null, heading: null } } as Location.LocationObject);
}
beforeEach(() => {
  jest.clearAllMocks();
  mockAcquire.mockResolvedValue(raw(0, 1000));
  jest.mocked(Location.watchPositionAsync).mockImplementation(async (_options, callback) => {
    watch = callback;
    return { remove };
  });
});

it('caches the real native reading while keeping a stationary display anchor', async () => {
  const view = await renderHook(() => useLiveLocation(true));
  const native = raw(4);
  await act(async () => emit(native));
  expect(view.result.current.fix!.latitude).toBe(13.2);
  expect(mockRemember).toHaveBeenLastCalledWith(native);
  await act(async () => { view.result.current.adoptDeviceFix(native); });
  expect(view.result.current.fix!.latitude).toBe(native.latitude);
});

it('reanchors the dot to the newer native fix when an acquisition completes late', async () => {
  const view = await renderHook(() => useLiveLocation(true));
  const older = raw(1, 500);
  const newer = raw(4);
  await act(async () => emit(newer));
  let accepted: RawFix | undefined;
  await act(async () => { accepted = view.result.current.adoptDeviceFix(older); });
  expect(accepted).toMatchObject({ latitude: newer.latitude, timestamp: newer.timestamp });
  expect(view.result.current.fix!.latitude).toBe(newer.latitude);
});

it('starts watching without waiting for an Android settings prompt', async () => {
  jest.mocked(Location.enableNetworkProviderAsync).mockImplementationOnce(() => new Promise(() => {}));
  await renderHook(() => useLiveLocation(true));
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
});

it('can reanchor to a usable device preview and retains its real uncertainty', async () => {
  const view = await renderHook(() => useLiveLocation(true));
  const preview = { ...raw(12), accuracy: 35 };
  await act(async () => { view.result.current.adoptDeviceFix(preview); });
  expect(view.result.current.fix).toMatchObject({ latitude: preview.latitude, accuracy: 35 });
});

it.each([12, 24, 45])('does not downgrade an 8 m acquired fix to a newer %s m watch reading', async accuracy => {
  const view = await renderHook(() => useLiveLocation(true));
  const acquired = { ...raw(1, 500), accuracy: 8 };
  await act(async () => emit({ ...raw(20), accuracy }));
  await act(async () => { view.result.current.adoptDeviceFix(acquired); });
  expect(view.result.current.fix).toMatchObject({ latitude: acquired.latitude, accuracy: 8 });
});

it('hides the dot while disabled and ignores late callbacks after unmount', async () => {
  const view = await renderHook<ReturnType<typeof useLiveLocation>, { enabled: boolean }>(
    ({ enabled }) => useLiveLocation(enabled), { initialProps: { enabled: true } });
  await view.rerender({ enabled: false });
  expect(view.result.current.fix).toBeNull();
  expect(remove).toHaveBeenCalledTimes(1);
  mockRemember.mockClear();
  await act(async () => emit(raw(40)));
  expect(mockRemember).not.toHaveBeenCalled();
});
