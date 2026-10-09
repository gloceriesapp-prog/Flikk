import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextPath } from '../src/lib/safeNext.ts';
import { sanitizeCustomerSearch } from '../src/lib/customerBlocks.ts';
import { orderStatusPresentation } from '../src/lib/orderStatus.ts';
import { isAllowedAdminEmail } from '../src/lib/adminAccess.ts';

test('redirect destinations stay local after URL normalization', () => {
  for (const input of ['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2fevil.test', '/%0aevil', '/api/auth/login', '/login', 'javascript:alert(1)', '/%zz'])
    assert.equal(safeNextPath(input), '/overview', input);
  assert.equal(safeNextPath('/orders?status=failed#latest'), '/orders?status=failed#latest');
});
test('customer search excludes PostgREST control syntax while retaining Unicode names', () => {
  assert.equal(sanitizeCustomerSearch('Nishal, Poojary'), 'Nishal Poojary');
  assert.equal(sanitizeCustomerSearch('José +919876543210'), 'José +919876543210');
  assert.doesNotMatch(sanitizeCustomerSearch('x),role.eq.admin,%_*\\"'), /[(),.%_*\\"]/);
  assert.equal(sanitizeCustomerSearch('x'.repeat(100)).length, 50);
});
test('failed and unknown order statuses never render blank', () => {
  assert.equal(orderStatusPresentation('failed').label, 'Delivery failed');
  assert.equal(orderStatusPresentation('new-status').label, 'Unknown status');
});
test('canonical admin allowlist rejects unrelated authenticated users', () => {
  assert.equal(isAllowedAdminEmail(' NishalPoojary810@gmail.com '), true);
  assert.equal(isAllowedAdminEmail('customer@example.com'), false);
});
