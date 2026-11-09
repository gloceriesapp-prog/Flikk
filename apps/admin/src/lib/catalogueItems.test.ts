import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsPattern } from './catalogueItems';

test('search text: needs two letters, collapses spaces, takes % and _ literally', () => {
  assert.equal(containsPattern(' a '), null);
  assert.equal(containsPattern('  amul   butter '), '%amul butter%');
  assert.equal(containsPattern('50%_off'), '%50\\%\\_off%');
});
