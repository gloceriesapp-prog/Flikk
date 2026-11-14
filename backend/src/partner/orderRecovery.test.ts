import { expect, it } from 'vitest';
import { computeNewlyArrivedIds } from '../../../apps/partner/src/store/orderBaseline';
const pending = { id: 'pending', status: 'placed', acceptanceDeadlineTimestamp: 2000 };
it('recovers an unaccepted order on first load but excludes accepted, expired and packed rows', () => {
  expect(computeNewlyArrivedIds([], [pending, { ...pending, id: 'accepted', acceptedAtTimestamp: 900 },
    { ...pending, id: 'expired', acceptanceDeadlineTimestamp: 999 }, { ...pending, id: 'packed', status: 'packed' }], false, 1000)).toEqual(['pending']);
});
it('does not alert repeatedly for the same pending order after recovery', () => {
  expect(computeNewlyArrivedIds([pending], [pending, { ...pending, id: 'next' }], true, 1000)).toEqual(['next']);
});
