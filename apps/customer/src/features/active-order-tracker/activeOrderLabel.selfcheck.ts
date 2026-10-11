// Run: npx tsx src/features/active-order-tracker/activeOrderLabel.selfcheck.ts
import { strict as assert } from 'node:assert';
import { activeOrderLabel } from './activeOrderLabel';

assert.equal(activeOrderLabel('placed'), 'Order placed');
assert.equal(activeOrderLabel('packed'), 'Order is getting packed!');
assert.equal(activeOrderLabel('out_for_delivery'), 'On the way!');

console.log('activeOrderLabel.selfcheck OK');
