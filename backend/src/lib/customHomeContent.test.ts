import { expect, it } from 'vitest';
import { createCustomContent, createSection, customContentKey, isHomeContentKey, validateContent } from '../../../packages/home-content/index.js';
import { mergeManagedTabs } from '../../../apps/customer/src/screens/home/content/mergeTabs';
const id = '00000000-0000-4000-8000-000000000001';
const key = customContentKey(id);
it('accepts only built-in keys or UUID-bound custom identities', () => {
  for (const value of ['grocery', 'meat', 'festivals', key]) expect(isHomeContentKey(value)).toBe(true);
  for (const value of ['custom-rice', '../grocery', '', null, ['grocery']]) expect(isHomeContentKey(value)).toBe(false);
  expect(() => customContentKey('bad')).toThrow();
});
it('keeps custom sections, ad order and independent visibility through validation', () => {
  const content = createCustomContent('Local snacks');
  const a = createSection('banner', 'first'); a.imageUrl = 'https://images.gloceries.com/first.png';
  const b = createSection('banner', 'second'); b.enabled = false;
  content.sections = [a, createSection('products', 'snacks'), b];
  expect(validateContent(content).sections.map(section => [section.id, section.enabled])).toEqual([['first', true], ['snacks', true], ['second', false]]);
});
it('routes renamed custom categories by ID and never resurrects deleted or hidden ones', () => {
  const record = { tabKey: key, homeTabId: id, revision: 1, updatedAt: '', content: createCustomContent('Weekend picks') };
  const tab = { id, name: 'Renamed category', tiles: [], banners: [] };
  expect(mergeManagedTabs([tab], [record])[0]).toMatchObject({ id, contentKey: key, label: 'Weekend picks' });
  expect(mergeManagedTabs([], [record])).toEqual([]);
  expect(mergeManagedTabs([tab], [{ ...record, content: { ...record.content, enabled: false } }])).toEqual([]);
});
