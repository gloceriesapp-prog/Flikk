// `npx tsx src/features/push-notifications/offerPush.selfcheck.ts` from apps/rider.
import assert from 'node:assert';
import { newOfferIds, parseRiderPush } from './offerPush';

assert.deepEqual(parseRiderPush({ type: 'dispatch_offer', orderId: 'o1' }), { type: 'dispatch_offer', orderId: 'o1' });
assert.deepEqual(parseRiderPush({ type: 'assignment', orderId: null }), { type: 'assignment', orderId: null });
assert.deepEqual(parseRiderPush({ type: 'assignment', orderId: '' }), { type: 'assignment', orderId: null });
assert.equal(parseRiderPush({ type: 'admin_message' }), null);
assert.equal(parseRiderPush(null), null);
assert.equal(parseRiderPush('dispatch_offer'), null);

assert.deepEqual(newOfferIds([], [{ orderId: 'a' }, { orderId: 'b' }]), ['a', 'b']);
assert.deepEqual(newOfferIds([{ orderId: 'a' }], [{ orderId: 'a' }, { orderId: 'b' }]), ['b']);
assert.deepEqual(newOfferIds([{ orderId: 'a' }, { orderId: 'b' }], [{ orderId: 'b' }]), []);
assert.deepEqual(newOfferIds([{ orderId: 'a' }], []), []);

console.log('offerPush selfcheck: ok');
