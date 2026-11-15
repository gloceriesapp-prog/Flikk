import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT, validateContent } from '../../../packages/home-content/index.js';
import { mergeManagedTabs } from '../../../apps/customer/src/screens/home/content/mergeTabs';
import { publicHomeHeader } from './homeContentHeader.js';
const image = 'https://images.gloceries.com/appsui/udupi-header.webp';
describe('editable quick-category headers', () => {
  it('accepts a public image and preserves old documents and reset-to-default', () => {
    const original = structuredClone(DEFAULT_CONTENT.regional);
    expect(validateContent(original)).toEqual(original);
    expect(validateContent({ ...original, headerImageUrl: image }).headerImageUrl).toBe(image);
    expect(validateContent({ ...original, headerImageUrl: '' }).headerImageUrl).toBe('');
  });
  it('rejects unsafe, credentialed and invalid image addresses', () => {
    for (const headerImageUrl of ['javascript:alert(1)', 'http://example.com/image.png', 'https://user:password@example.com/image.png', 'not-a-url']) {
      expect(() => validateContent({ ...DEFAULT_CONTENT.regional, headerImageUrl })).toThrow();
    }
  });
  it('keeps the public version-1 document free of new keys for old installed clients', () => {
    const { content, headerImageUrl } = publicHomeHeader({ ...DEFAULT_CONTENT.regional, headerImageUrl: image });
    expect(content).toEqual(DEFAULT_CONTENT.regional);
    expect(headerImageUrl).toBe(image);
    expect(publicHomeHeader(DEFAULT_CONTENT.regional)).toEqual({ content: DEFAULT_CONTENT.regional });
  });
  it('maps the header separately from the quick-category card artwork, including custom tabs', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const tabs = [{ id, name: 'Udupi', imageUrl: 'card.webp', tiles: [], banners: [] }];
    const record = { tabKey: 'regional' as const, homeTabId: id, revision: 1, updatedAt: '', content: DEFAULT_CONTENT.regional, headerImageUrl: image };
    expect(mergeManagedTabs(tabs, [record])[0]).toMatchObject({ imageUrl: 'card.webp', headerImageUrl: image });
    expect(mergeManagedTabs(tabs, [{ ...record, tabKey: `custom-${id}` as const }])[0]?.headerImageUrl).toBe(image);
    expect(mergeManagedTabs([], [record])[0]?.headerImageUrl).toBe(image);
  });
});
