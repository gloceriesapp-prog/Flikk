import { expect, it, vi } from 'vitest';
vi.mock('../../../apps/partner/src/api/client', () => ({ apiRequest: vi.fn() }));
import { getRemainingAcceptMs, hasAcceptWindowExpired, setOrderAcceptWindowMinutes } from '../../../apps/partner/src/features/order-expiry/orderExpiry';
it('uses the server snapshot deadline rather than local settings or checkout time', () => {
  setOrderAcceptWindowMinutes(3);
  const order = { placedAtTimestamp: 0, acceptWindowStartTimestamp: 50_000, acceptanceDeadlineTimestamp: 100_000 } as never;
  expect(getRemainingAcceptMs(order, 75_000)).toBe(25_000); expect(hasAcceptWindowExpired(order, 100_000)).toBe(true);
});
it('does not treat an accepted order as waiting for acceptance', () => {
  expect(getRemainingAcceptMs({ acceptedAtTimestamp: 1, acceptanceDeadlineTimestamp: 100_000 } as never, 50_000)).toBe(0);
});
