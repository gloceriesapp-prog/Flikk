import { expect, it } from 'vitest';
import { resolveQuickDestination } from './quickCategoryDestination.js';

it('uses the Home collection when no direct catalogue target is configured', () => {
  expect(resolveQuickDestination({}, new Set(), new Map())).toEqual({ configured: false, link: null });
});
it('resolves a category and a subcategory to the correct parent', () => {
  expect(resolveQuickDestination({ quick_category_id: 'fruit' }, new Set(['fruit']), new Map()).link)
    .toEqual({ type: 'category', id: 'fruit', category_id: 'fruit' });
  expect(resolveQuickDestination({ quick_subcategory_id: 'apples' }, new Set(['fruit']), new Map([['apples', 'fruit']])).link)
    .toEqual({ type: 'subcategory', id: 'apples', category_id: 'fruit' });
});
it('does not resolve hidden/deleted targets or children of inactive categories', () => {
  for (const row of [{ quick_destination_type: 'category', quick_category_id: null }, { quick_category_id: 'hidden' }, { quick_subcategory_id: 'removed' }, { quick_subcategory_id: 'apples' }]) {
    expect(resolveQuickDestination(row, new Set(), new Map([['apples', 'hidden']]))).toEqual({ configured: true, link: null });
  }
});
