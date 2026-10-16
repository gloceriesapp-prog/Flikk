import { expect, it } from 'vitest';
import { orderPollDelay } from '../../../apps/partner/src/features/incoming-order-alert/orderPollDelay';
it('jitters normal checks and caps outages after applying jitter', () => {
  expect(orderPollDelay(0, 0)).toBe(10_200);
  expect(orderPollDelay(0, 1)).toBe(13_800);
  expect(orderPollDelay(1, 0.5)).toBe(24_000);
  expect(orderPollDelay(100, 1)).toBe(120_000);
});
