import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSectionName } from './categorySectionName';

const existing = [{ id: 'a', name: 'Groceries & Cooking' }, { id: 'b', name: 'Snacks' }];

test('trims and collapses spaces', () => {
  assert.equal(cleanSectionName('  Dairy   & Chilled ', existing), 'Dairy & Chilled');
});

test('refuses blank, too long, and duplicate titles', () => {
  assert.throws(() => cleanSectionName('   ', existing), /required/);
  assert.throws(() => cleanSectionName('x'.repeat(41), existing), /40 characters/);
  assert.throws(() => cleanSectionName('snacks', existing), /already exists/);
});

test('a rename may keep its own name or change its case', () => {
  assert.equal(cleanSectionName('SNACKS', existing, 'b'), 'SNACKS');
  assert.throws(() => cleanSectionName('Snacks', existing, 'a'), /already exists/);
});
