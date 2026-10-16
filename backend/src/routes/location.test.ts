import { afterEach, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const reverse = vi.hoisted(() => vi.fn());
vi.mock('../lib/reverseGeocode.js', () => ({ reverseGeocode: reverse }));
vi.mock('../customer-experience/mapsBudget.js', () => ({ mapsBudget: () => (_req: Request, _res: Response, next: NextFunction) => next() }));
import { locationRouter } from './location.js';

afterEach(() => vi.clearAllMocks());
// Exercise the asynchronous handler without opening a real listening socket.
const layer = locationRouter.stack.find(candidate => candidate.route?.path === '/reverse-geocode');
const handle = layer!.route!.stack[0]!.handle;
async function lookup() {
  const json = vi.fn();
  const next = vi.fn();
  await handle({ query: { lat: '13.2743', lng: '74.7597' } } as unknown as Request, { json } as unknown as Response, next);
  return { json, next };
}

it('turns an unavailable provider into a retryable HTTP error rather than a cached null success', async () => {
  reverse.mockResolvedValue({ status: 'unavailable', addressLabel: null, shortName: null, city: null });
  const { json, next } = await lookup();
  expect(json).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 503, code: 'LOCATION_PROVIDER_UNAVAILABLE' }));
});
it('returns an actual address for the exact requested pin', async () => {
  const result = { status: 'resolved', addressLabel: 'Main Road, Kaup, Karnataka', shortName: 'Main Road', city: 'Kaup' };
  reverse.mockResolvedValue(result);
  const { json, next } = await lookup();
  expect(reverse).toHaveBeenCalledWith(13.2743, 74.7597);
  expect(json).toHaveBeenCalledWith(result);
  expect(next).not.toHaveBeenCalled();
});
