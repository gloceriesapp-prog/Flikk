import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ claimMapsBudget: vi.fn(), fetchRoute: vi.fn() }));
vi.mock('../config/env.js', () => ({ env: { googleRoutesApiKey: 'test-key' } }));
vi.mock('../customer-experience/mapsBudget.js', () => ({ claimMapsBudget: mocks.claimMapsBudget }));
vi.mock('../lib/routeDirections.js', () => ({ fetchRoute: mocks.fetchRoute }));

import { deliveryRoute, MAX_REROUTES, REROUTE_GAP_MS } from './deliveryRoute.js';

const pickup = { latitude: 13.33, longitude: 74.74 };
const destination = { latitude: 13.34, longitude: 74.75 };
const points = [pickup, destination];

beforeEach(() => {
  vi.useFakeTimers();
  mocks.claimMapsBudget.mockReset().mockResolvedValue(0);
  mocks.fetchRoute.mockReset().mockResolvedValue({ points });
});
afterEach(async () => {
  await vi.runAllTimersAsync();
  vi.useRealTimers();
});

it('shares one provider calculation between concurrent viewers and expires the cached route', async () => {
  const route = () => deliveryRoute('leg-a', pickup, destination);
  expect(await Promise.all([route(), route(), route()])).toEqual([points, points, points]);
  expect(await route()).toEqual(points);
  expect(mocks.fetchRoute).toHaveBeenCalledOnce();
  expect(mocks.fetchRoute).toHaveBeenCalledWith(pickup, destination, 'HIGH_QUALITY');
  expect(mocks.claimMapsBudget).toHaveBeenCalledOnce();

  await vi.advanceTimersByTimeAsync(60 * 60_000);
  expect(await route()).toEqual(points);
  expect(mocks.fetchRoute).toHaveBeenCalledTimes(2);
});

it('keeps the provider quota failure off the tracking path and throttles retries', async () => {
  mocks.claimMapsBudget.mockResolvedValueOnce(30);
  const route = () => deliveryRoute('leg-b', pickup, destination);
  expect(await route()).toBeNull();
  expect(await route()).toBeNull();
  expect(mocks.fetchRoute).not.toHaveBeenCalled();

  await vi.advanceTimersByTimeAsync(60_000);
  expect(await route()).toEqual(points);
  expect(mocks.fetchRoute).toHaveBeenCalledOnce();
});

it('costs one provider call per delivery however far the rider moves', async () => {
  const route = (latitude: number) => deliveryRoute('leg-c', { latitude, longitude: 74.74 }, destination);
  await route(13.3301);
  await route(13.3304);
  await route(13.3321);
  await route(13.3389);
  expect(mocks.fetchRoute).toHaveBeenCalledOnce();
  expect(mocks.fetchRoute).toHaveBeenCalledWith({ latitude: 13.3301, longitude: 74.74 }, destination, 'HIGH_QUALITY');
  // A different leg (another order) is its own route.
  await deliveryRoute('leg-d', { latitude: 13.3301, longitude: 74.74 }, destination);
  expect(mocks.fetchRoute).toHaveBeenCalledTimes(2);
});

it('re-routes a rider who left the road, at most MAX_REROUTES times and REROUTE_GAP_MS apart', async () => {
  const moved = (latitude: number) => ({ latitude, longitude: 74.74 });
  const route = (latitude: number, reroute: boolean) => deliveryRoute('leg-e', moved(latitude), destination, reroute);
  await route(13.330, false);
  expect(mocks.fetchRoute).toHaveBeenCalledOnce();

  // Too soon after the last calculation: keep the route.
  await route(13.332, true);
  expect(mocks.fetchRoute).toHaveBeenCalledOnce();

  // A minute later, ~200 m away on another road: a fresh route from there.
  await vi.advanceTimersByTimeAsync(REROUTE_GAP_MS);
  await route(13.332, true);
  expect(mocks.fetchRoute).toHaveBeenCalledTimes(2);
  expect(mocks.fetchRoute).toHaveBeenLastCalledWith(moved(13.332), destination, 'HIGH_QUALITY');

  // Barely moved since that route: same road, no call.
  await vi.advanceTimersByTimeAsync(REROUTE_GAP_MS);
  await route(13.3322, true);
  expect(mocks.fetchRoute).toHaveBeenCalledTimes(2);

  // Two more re-routes, then the cap holds.
  for (const latitude of [13.334, 13.336, 13.338, 13.340]) {
    await vi.advanceTimersByTimeAsync(REROUTE_GAP_MS);
    await route(latitude, true);
  }
  expect(mocks.fetchRoute).toHaveBeenCalledTimes(1 + MAX_REROUTES);
});

it('keeps the previous route when a re-route fails', async () => {
  await deliveryRoute('leg-f', pickup, destination);
  await vi.advanceTimersByTimeAsync(REROUTE_GAP_MS);
  mocks.fetchRoute.mockResolvedValueOnce(null);
  expect(await deliveryRoute('leg-f', { latitude: 13.335, longitude: 74.74 }, destination, true)).toEqual(points);
});
