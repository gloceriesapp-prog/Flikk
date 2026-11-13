import { expect, it } from 'vitest';
import { createSection, createItem, DEFAULT_CONTENT } from '../../../packages/home-content/index.js';
import { missingReferenceSummary, parseMissingReferences, removeMissingReferences } from '../../../apps/admin/src/features/home-content/missingReferences';

it('finds and removes only confirmed missing IDs across hidden sections and nested selections', () => {
  const section = createSection('products', 'hidden', 'Hidden drinks');
  section.enabled = false;
  section.selection.mode = 'manual';
  section.selection.productIds = ['valid-2', 'gone', 'valid-1'];
  section.selection.categoryIds = ['category-ok', 'category-gone'];
  section.items = [createItem('juice', 'Juice')];
  section.items[0]!.selection.storeIds = ['store-gone', 'store-ok'];
  section.items[0]!.selection.productIds = ['valid-1', 'gone'];
  const content = { ...structuredClone(DEFAULT_CONTENT.grocery), sections: [section] };
  const original = structuredClone(content);
  const missing = { productIds: ['gone'], categoryIds: ['category-gone'], storeIds: ['store-gone'] };
  expect(missingReferenceSummary(content, missing)).toEqual([
    { sectionId: 'hidden', label: 'Hidden drinks', count: 2, hidden: true },
    { sectionId: 'hidden', label: 'Hidden drinks → Juice', count: 2, hidden: true },
  ]);
  const cleaned = removeMissingReferences(content, missing);
  expect(cleaned.sections[0]!.selection).toMatchObject({ mode: 'manual', productIds: ['valid-2', 'valid-1'], categoryIds: ['category-ok'] });
  expect(cleaned.sections[0]!.items[0]!.selection).toMatchObject({ productIds: ['valid-1'], storeIds: ['store-ok'] });
  expect(cleaned.sections[0]!.enabled).toBe(false);
  expect(content).toEqual(original);
  expect(removeMissingReferences(cleaned, missing)).toEqual(cleaned);
});
it('ignores malformed repair metadata and deduplicates a valid report', () => {
  expect(parseMissingReferences(null)).toBeNull();
  expect(parseMissingReferences({ productIds: ['x'] })).toBeNull();
  expect(parseMissingReferences({ productIds: [true], categoryIds: [], storeIds: [] })).toBeNull();
  expect(parseMissingReferences({ productIds: ['x', 'x'], categoryIds: [], storeIds: [] })).toEqual({ productIds: ['x'], categoryIds: [], storeIds: [] });
});
it('does not change valid content or fabricate products when no IDs are missing', () => {
  const content = structuredClone(DEFAULT_CONTENT.grocery);
  expect(removeMissingReferences(content, { productIds: [], categoryIds: [], storeIds: [] })).toEqual(content);
});
