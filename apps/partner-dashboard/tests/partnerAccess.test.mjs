import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartPartnerSession } from '../src/lib/partnerAccess.ts';

for (const [role, submitted, expected] of [
  ['store_owner', false, true],
  ['customer', true, true],
  ['customer', false, false],
  ['rider', true, false],
  ['admin', true, false],
  ['unknown', true, false],
]) {
  test(`partner login role ${role}, application ${submitted}`, () => {
    assert.equal(canStartPartnerSession({ role, application_submitted: submitted }), expected);
  });
}
