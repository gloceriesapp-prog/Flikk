import type { HomeSectionConfig } from '../useHomeSections';

const TASTE_KEY = 'custom-tasteofudupi';
const DEFAULT_SECTIONS: { key: string; title?: string }[] = [
  { key: 'quick-categories' },
  { key: 'everyday-dairy', title: 'Our Local Favourites' },
  { key: TASTE_KEY, title: 'Taste of Udupi' },
  { key: 'category-sections' },
  { key: 'preorders' },
  { key: 'everyday-essentials', title: 'Daily Essentials' },
  { key: 'nearby-stores' },
  { key: 'deals-for-you', title: 'Deals for You' },
  { key: 'price-drops' },
  { key: 'brand-footer' },
];

export function resolveAllTabSections(config: HomeSectionConfig[] = []): HomeSectionConfig[] {
  const ordered = [...config].sort((a, b) => a.sortIndex - b.sortIndex);
  // A layout-aware API sends displayLayout even for sections with a fixed design.
  if (ordered.some((section) => section.displayLayout !== undefined)) {
    return ordered.filter((section) => section.enabled && section.key !== 'festival-greeting');
  }

  const byKey = new Map(ordered.map((section) => [section.key, section]));
  const taste = ordered.find((section) => section.custom && section.title?.trim().toLowerCase() === 'taste of udupi');
  const sections = DEFAULT_SECTIONS.map(({ key, title }, sortIndex) => {
    const saved = key === TASTE_KEY ? (taste ?? byKey.get(key)) : byKey.get(key);
    return {
      key,
      enabled: true,
      sortIndex,
      subtitle: null,
      bgColor: null,
      custom: key === TASTE_KEY,
      ...saved,
      title: title ?? saved?.title ?? null,
      ...(key === TASTE_KEY ? { displayLayout: 'horizontal' as const } : {}),
    };
  });

  const featured = new Set(sections.map((section) => section.key));
  const extra = ordered.filter((section) => section.custom && !featured.has(section.key));
  return [...sections.slice(0, -1), ...extra, sections[sections.length - 1]]
    .filter((section) => section.enabled);
}
