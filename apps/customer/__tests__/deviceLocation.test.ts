/* eslint-disable @typescript-eslint/no-require-imports -- Isolate the in-memory device cache for each test. */
import type { LocationObject } from 'expo-location';

let service: typeof import('../src/location/deviceLocation');
let gps: jest.Mock;
let cached: jest.Mock;
let watch: jest.Mock;
let remove: jest.Mock;
function position(age = 0, accuracy = 8): LocationObject {
  return { timestamp: Date.now() - age, coords: { latitude: 13.2, longitude: 74.7,
    accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: 0 } };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.isolateModules(() => {
    service = require('../src/location/deviceLocation');
    const location = require('expo-location');
    gps = location.getCurrentPositionAsync;
    cached = location.getLastKnownPositionAsync;
    watch = location.watchPositionAsync;
  });
  gps.mockReset(); cached.mockReset(); cached.mockResolvedValue(null);
  remove = jest.fn(); watch.mockReset(); watch.mockResolvedValue({ remove });
});
afterEach(async () => { await jest.runOnlyPendingTimersAsync(); jest.useRealTimers(); });

it('shares a single GPS acquisition between simultaneous callers', async () => {
  gps.mockResolvedValue(position());
  const first = service.getDeviceLocationFix();
  expect(service.getDeviceLocationFix()).toBe(first);
  await first;
  expect(gps).toHaveBeenCalledTimes(1);
});

it('uses a recent precise watch reading immediately without another GPS request', async () => {
  service.rememberDeviceFix({ ...position().coords, timestamp: Date.now() });
  await expect(service.getDeviceLocationFix()).resolves.toMatchObject({ latitude: 13.2 });
  expect(gps).not.toHaveBeenCalled();
});

it('returns fresh GPS without waiting for a stalled cached-position lookup', async () => {
  gps.mockResolvedValue(position());
  cached.mockImplementation(() => new Promise(() => {}));
  await expect(service.getDeviceLocationFix()).resolves.toMatchObject({ accuracy: 8 });
});

it('can show a precise two-second device fix while a new GPS fix is being acquired', async () => {
  gps.mockImplementation(() => new Promise(() => {}));
  cached.mockResolvedValue(position(1000, 10));
  await expect(service.getDeviceLocationFix()).resolves.toMatchObject({ accuracy: 10 });
});

it.each([[3000, 8], [0, 80]])('does not use cached age %i ms / accuracy %i m', async (age, accuracy) => {
  let resolve!: (value: LocationObject) => void;
  gps.mockImplementation(() => new Promise(value => { resolve = value; }));
  cached.mockResolvedValue(position(age, accuracy));
  const pending = service.getDeviceLocationFix();
  let completed = false;
  void pending.then(() => { completed = true; });
  await jest.advanceTimersByTimeAsync(1);
  expect(completed).toBe(false);
  resolve(position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
});

it('falls back to fresh GPS when the cached provider fails', async () => {
  cached.mockRejectedValue(new Error('cache unavailable'));
  gps.mockResolvedValue(position());
  await expect(service.getDeviceLocationFix()).resolves.toMatchObject({ accuracy: 8 });
});

it('expires the fast memory path instead of reusing an old position', async () => {
  service.rememberDeviceFix({ ...position().coords, timestamp: Date.now() });
  await jest.advanceTimersByTimeAsync(2001);
  gps.mockResolvedValue(position());
  await service.getDeviceLocationFix();
  expect(gps).toHaveBeenCalledTimes(1);
});


it('waits for a valid cached fix when fresh GPS fails first', async () => {
  gps.mockRejectedValue(new Error('provider temporarily unavailable'));
  let resolve!: (value: LocationObject) => void;
  cached.mockImplementation(() => new Promise(value => { resolve = value; }));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(10);
  resolve(position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
});

it.each([80, 0, null])('refines an initial accuracy of %s instead of pinning a coarse position', async accuracy => {
  const initial = position(); initial.coords.accuracy = accuracy;
  gps.mockResolvedValue(initial);
  const pending = service.getDeviceLocationFix();
  let completed = false;
  void pending.then(() => { completed = true; });
  await jest.advanceTimersByTimeAsync(1);
  expect(completed).toBe(false);
  expect(watch).toHaveBeenCalledTimes(1);
  const updated = position(); updated.coords.latitude = 13.2001;
  watch.mock.calls[0][1](updated);
  await expect(pending).resolves.toMatchObject({ latitude: 13.2001, accuracy: 8 });
  expect(remove).toHaveBeenCalledTimes(1);
});

it('bounds refinement to the original acquisition deadline and removes its watch', async () => {
  gps.mockResolvedValue(position(0, 80));
  const pending = service.getDeviceLocationFix();
  const outcome = expect(pending).rejects.toThrow('fresh, accurate location');
  await jest.advanceTimersByTimeAsync(15_000);
  await outcome;
  expect(remove).toHaveBeenCalledTimes(1);
});

it('removes a late watch registration after the cached path has already won', async () => {
  gps.mockResolvedValue(position(0, 80));
  let register!: (value: { remove: jest.Mock }) => void;
  let resolveCached!: (value: LocationObject) => void;
  watch.mockImplementation(() => new Promise(value => { register = value; }));
  cached.mockImplementation(() => new Promise(value => { resolveCached = value; }));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1);
  resolveCached(position());
  await pending;
  register({ remove });
  await jest.advanceTimersByTimeAsync(1);
  expect(remove).toHaveBeenCalledTimes(1);
});

it('removes its immediate watch when a cached winner precedes a coarse GPS result', async () => {
  let resolve!: (value: LocationObject) => void;
  gps.mockImplementation(() => new Promise(value => { resolve = value; }));
  cached.mockResolvedValue(position());
  await service.getDeviceLocationFix();
  resolve(position(0, 80));
  await jest.advanceTimersByTimeAsync(1);
  expect(watch).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
});

it('ignores late callbacks after timeout instead of overwriting the device cache', async () => {
  gps.mockResolvedValue(position(0, 80));
  const pending = service.getDeviceLocationFix();
  const outcome = expect(pending).rejects.toThrow('fresh, accurate location');
  await jest.advanceTimersByTimeAsync(15_000);
  await outcome;
  watch.mock.calls[0][1](position());
  gps.mockResolvedValue(position());
  await service.getDeviceLocationFix();
  expect(gps).toHaveBeenCalledTimes(2);
});

it('rejects promptly if all providers fail and allows the next attempt', async () => {
  gps.mockRejectedValue(new Error('GPS unavailable'));
  cached.mockRejectedValue(new Error('cache unavailable'));
  watch.mockRejectedValueOnce(new Error('watch unavailable'));
  await expect(service.getDeviceLocationFix()).rejects.toThrow('fresh, accurate location');
  gps.mockResolvedValue(position());
  await expect(service.getDeviceLocationFix()).resolves.toMatchObject({ accuracy: 8 });
});

it('does not count repeated watch errors as failure of the cached provider', async () => {
  gps.mockResolvedValue(position(0, 80));
  let resolve!: (value: LocationObject) => void;
  cached.mockImplementation(() => new Promise(value => { resolve = value; }));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1);
  watch.mock.calls[0][2]('temporary watch failure');
  watch.mock.calls[0][2]('temporary watch failure');
  resolve(position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
  expect(remove).toHaveBeenCalledTimes(1);
});

it('removes the refinement watch when its provider fails', async () => {
  gps.mockResolvedValue(position(0, 80));
  const pending = service.getDeviceLocationFix();
  const outcome = expect(pending).rejects.toThrow('fresh, accurate location');
  await jest.advanceTimersByTimeAsync(1);
  watch.mock.calls[0][2]('permission revoked');
  await outcome;
  expect(remove).toHaveBeenCalledTimes(1);
});


it('starts the live watch immediately and resolves despite a stalled single read', async () => {
  gps.mockImplementation(() => new Promise(() => {}));
  const pending = service.getDeviceLocationFix();
  expect(watch).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  watch.mock.calls[0][1](position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
  expect(remove).toHaveBeenCalledTimes(1);
});

it('keeps the live watch usable after single read and cache failures', async () => {
  gps.mockRejectedValue(new Error('single unavailable'));
  cached.mockRejectedValue(new Error('cache unavailable'));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1);
  watch.mock.calls[0][1](position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
});

it('does not let repeated watch errors defeat a pending single read', async () => {
  let resolve!: (value: LocationObject) => void;
  gps.mockImplementation(() => new Promise(value => { resolve = value; }));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1);
  watch.mock.calls[0][2]('watch temporarily unavailable');
  watch.mock.calls[0][2]('watch temporarily unavailable');
  resolve(position());
  await expect(pending).resolves.toMatchObject({ accuracy: 8 });
});


it('returns a usable live 35 m preview after allowing time for precision', async () => {
  gps.mockResolvedValue(position(0, 35));
  const pending = service.getDeviceLocationFix();
  let completed = false;
  void pending.then(() => { completed = true; });
  await jest.advanceTimersByTimeAsync(2499);
  expect(completed).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toMatchObject({ accuracy: 35 });
  expect(remove).toHaveBeenCalledTimes(1);
});

it('prefers a precise 22 m update before the preview grace period ends', async () => {
  gps.mockResolvedValue(position(0, 35));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1000);
  watch.mock.calls[0][1](position(0, 22));
  await expect(pending).resolves.toMatchObject({ accuracy: 22 });
  expect(remove).toHaveBeenCalledTimes(1);
});

it.each([[0, 51], [5001, 35]])('does not preview native age %s ms / accuracy %s m', async (age, accuracy) => {
  gps.mockResolvedValue(position(age, accuracy));
  const pending = service.getDeviceLocationFix();
  const outcome = expect(pending).rejects.toThrow('fresh, accurate location');
  await jest.advanceTimersByTimeAsync(15_000);
  await outcome;
});

it('replaces an expired better candidate with a newer usable live fix', async () => {
  gps.mockResolvedValue(position(4000, 30));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(2000);
  watch.mock.calls[0][1](position(0, 40));
  await jest.advanceTimersByTimeAsync(500);
  await expect(pending).resolves.toMatchObject({ accuracy: 40 });
});

it('accepts a usable native fix immediately once the grace period has elapsed', async () => {
  gps.mockImplementation(() => new Promise(() => {}));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(3000);
  watch.mock.calls[0][1](position(0, 35));
  await expect(pending).resolves.toMatchObject({ accuracy: 35 });
});

it('never promotes a coarse cached position to the live preview fallback', async () => {
  gps.mockImplementation(() => new Promise(() => {}));
  cached.mockResolvedValue(position(0, 35));
  const pending = service.getDeviceLocationFix();
  const outcome = expect(pending).rejects.toThrow('fresh, accurate location');
  await jest.advanceTimersByTimeAsync(15_000);
  await outcome;
});

it('exposes the same graded native-fix validity policy for the map hook', () => {
  const fix = { latitude: 13.2, longitude: 74.7, timestamp: Date.now(), accuracy: 35 };
  expect(service.isUsableDeviceFix(fix)).toBe(true);
  expect(service.isUsableDeviceFix({ ...fix, accuracy: 51 })).toBe(false);
  expect(service.isUsableDeviceFix({ ...fix, accuracy: null })).toBe(false);
  expect(service.isUsableDeviceFix({ ...fix, timestamp: Date.now() - 5001 })).toBe(false);
});


it('retains a recent preview when the most accurate candidate expires during grace', async () => {
  gps.mockResolvedValue(position(3500, 30));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1000);
  watch.mock.calls[0][1](position(0, 40));
  await jest.advanceTimersByTimeAsync(1500);
  await expect(pending).resolves.toMatchObject({ accuracy: 40 });
});

it('keeps the most accurate still-fresh native preview during refinement', async () => {
  gps.mockResolvedValue(position(0, 30));
  const pending = service.getDeviceLocationFix();
  await jest.advanceTimersByTimeAsync(1000);
  watch.mock.calls[0][1](position(0, 45));
  await jest.advanceTimersByTimeAsync(1500);
  await expect(pending).resolves.toMatchObject({ accuracy: 30 });
});
