import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { apiRequest } from '../src/api/client';
import { getCurrentCoordinates, requestLocationPermission, reverseGeocode } from '../src/location/geocoding';

jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);
const native = jest.mocked(Location.reverseGeocodeAsync);
const pin = { latitude: 13.223, longitude: 74.744 };

beforeEach(() => { request.mockReset(); native.mockReset(); });
afterEach(() => { jest.useRealTimers(); });

it('uses the server address with a bounded request and no unnecessary native lookup', async () => {
  request.mockResolvedValue({ addressLabel: ' Market Road, Kaup ', shortName: 'Market Road', city: 'Kaup' });
  expect(await reverseGeocode(pin)).toEqual({ addressLabel: 'Market Road, Kaup', shortName: 'Market Road', city: 'Kaup', resolved: true });
  expect(request).toHaveBeenCalledWith(expect.stringContaining('/location/reverse-geocode?'), { auth: false, timeoutMs: 8000 });
  expect(native).not.toHaveBeenCalled();
});
it('falls back to a complete native street address when the server fails', async () => {
  request.mockRejectedValue(new Error('offline'));
  native.mockResolvedValue([{ name: 'Market Road', street: 'Market Road', district: 'Kaup', city: 'Kaup', region: 'Karnataka', postalCode: '574106' }] as never);
  expect(await reverseGeocode(pin)).toMatchObject({ addressLabel: 'Market Road, Kaup, Karnataka, 574106', resolved: true });
});
it('does not accept generic placeholders as resolved addresses', async () => {
  request.mockResolvedValue({ addressLabel: 'Selected location' }); native.mockResolvedValue([]);
  expect(await reverseGeocode(pin)).toEqual({ addressLabel: '', city: '', shortName: 'Pinned location', resolved: false });
});
it('bounds a stalled native geocoder and returns an explicit unresolved state', async () => {
  jest.useFakeTimers(); request.mockRejectedValue(new Error('offline'));
  native.mockImplementation(() => new Promise(() => {}));
  const pending = reverseGeocode(pin);
  await jest.advanceTimersByTimeAsync(3000);
  expect(await pending).toMatchObject({ resolved: false });
  expect(jest.getTimerCount()).toBe(0);
});
it('rejects invalid pins before calling either provider', async () => {
  expect(await reverseGeocode({ latitude: 91, longitude: 74 })).toMatchObject({ resolved: false });
  expect(request).not.toHaveBeenCalled(); expect(native).not.toHaveBeenCalled();
});

it('does not use a stale or very coarse one-off GPS result as the delivery pin', async () => {
  jest.useFakeTimers();
  const gps = jest.mocked(Location.getCurrentPositionAsync);
  for (const position of [
    { coords: { ...pin, accuracy: 250 }, timestamp: Date.now() },
    { coords: { ...pin, accuracy: 8 }, timestamp: Date.now() - 60000 },
  ]) {
    gps.mockResolvedValueOnce(position as never);
    const assertion = expect(getCurrentCoordinates()).rejects.toThrow('fresh, accurate location');
    // Coarse initial readings now have a bounded opportunity to improve.
    await jest.advanceTimersByTimeAsync(15000);
    await assertion;
  }
});


it('reuses granted permission without prompting or waiting for Activity recreation', async () => {
  jest.useFakeTimers();
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'granted' } as never);
  const before = jest.mocked(Location.requestForegroundPermissionsAsync).mock.calls.length;
  await expect(requestLocationPermission()).resolves.toBe(true);
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(before);
  expect(jest.getTimerCount()).toBe(0);
});

it('retains the native Activity settling delay after a new permission grant', async () => {
  jest.useFakeTimers();
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as never);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'granted' } as never);
  let completed = false;
  const pending = requestLocationPermission().then(value => { completed = true; return value; });
  await jest.advanceTimersByTimeAsync(399);
  expect(completed).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toBe(true);
});


it.each([{ android: { accuracy: 'coarse' } }, { ios: { accuracy: 'reduced' } }])('does not present approximate permission as precise GPS: %j', async details => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'granted', ...details } as never);
  await expect(requestLocationPermission()).resolves.toBe(false);
  expect(alert).toHaveBeenCalledWith('Enable precise location', expect.stringContaining('choose your pin manually'), expect.any(Array));
  alert.mockRestore();
});
