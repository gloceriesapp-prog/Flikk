import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ claimMapsBudget: vi.fn(), fetchRoute: vi.fn() }));
vi.mock('../config/env.js', () => ({ env: { googleRoutesApiKey: 'test-key' } }));
vi.mock('../customer-experience/mapsBudget.js', () => ({ claimMapsBudget: mocks.claimMapsBudget }));
vi.mock('../lib/routeDirections.js', () => ({ fetchRoute: mocks.fetchRoute }));

import { deliveryRoute } from './deliveryRoute.js';

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
