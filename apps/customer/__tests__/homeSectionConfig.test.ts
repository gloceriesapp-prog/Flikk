import { parseHomeSections } from '../src/screens/home/content/sectionConfig';
import { resolveAllTabSections } from '../src/screens/home/sections/allTabLayout';
import { supportsHomeBanner } from '../../../packages/home-content/sectionLayout.js';
const row = { key: 'deals-for-you', enabled: true, sortIndex: 20, displayLayout: 'grid' };

it('preserves admin order, visibility, titles, layout and optional HTTPS artwork', () => {
  const data = parseHomeSections([
    { ...row, title: ' Weekly deals ', bannerImageUrl: 'https://images.gloceries.com/deals.png' },
    { ...row, key: 'trending', enabled: false, sortIndex: 0 },
    { ...row, key: 'everyday-dairy', sortIndex: 10, displayLayout: 'horizontal' },
  ]);
  expect(resolveAllTabSections(data).map(s => s.key)).toEqual(['everyday-dairy', 'deals-for-you']);
  expect(data[0]).toMatchObject({ title: 'Weekly deals', displayLayout: 'grid', bannerImageUrl: 'https://images.gloceries.com/deals.png' });
});
it('rejects unusable layouts rather than replacing good cached data', () => {
  for (const value of [null, {}, [{ ...row, sortIndex: 'bad' }], [row, row]]) expect(() => parseHomeSections(value)).toThrow();
  expect(parseHomeSections([])).toEqual([]);
});
it('drops unsafe artwork and styling without losing valid products', () => {
  expect(parseHomeSections([{ ...row, bannerImageUrl: 'http://unsafe/image', bgColor: 'red' }])[0])
    .toMatchObject({ bannerImageUrl: null, bgColor: null });
  expect(supportsHomeBanner('custom-abc12345')).toBe(true);
  expect(supportsHomeBanner('quick-categories')).toBe(false);
});

it('preserves a catalogue category through restored Home layout data', () => {
  const sourceCategoryId = 'a0000000-0000-4000-8000-000000000001';
  const config = parseHomeSections([{ ...row, sourceCategoryId }]);
  expect(resolveAllTabSections(parseHomeSections(config))[0]?.sourceCategoryId).toBe(sourceCategoryId);
  expect(parseHomeSections([{ ...row, sourceCategoryId: 'invalid' }])[0]?.sourceCategoryId).toBeUndefined();
});
