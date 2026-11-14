import { expect, it } from 'vitest';
import { orderPollDelay } from '../../../apps/partner/src/features/incoming-order-alert/orderPollDelay';
it('jitters normal checks and caps outages after applying jitter', () => {
  expect(orderPollDelay(0, 0)).toBe(2975);
  expect(orderPollDelay(0, 1)).toBe(4025);
  expect(orderPollDelay(1, 0.5)).toBe(7000);
  expect(orderPollDelay(100, 1)).toBe(120_000);
});
