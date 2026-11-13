import type { HomeContentSection, SectionKind } from '@/lib/homeContent';

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  products: 'Products', categories: 'Category tiles', brands: 'Brands', stores: 'Shops',
  banner: 'Image ad / banner', hero: 'Hero', festival: 'Festival shelf', footer: 'Footer',
};
export type SectionPlacement = 'before' | 'after' | 'end';

// Section order is also ad placement: no separate hard-coded slots or ad limits.
export function insertContentSection(sections: HomeContentSection[], section: HomeContentSection,
  selectedId: string, placement: SectionPlacement): HomeContentSection[] {
  if (sections.length >= 40) throw new Error('A tab can contain up to 40 sections, including image ads.');
  if (sections.some(item => item.id === section.id)) throw new Error('This section already exists.');
  const selected = sections.findIndex(item => item.id === selectedId);
  const index = placement === 'end' || selected < 0 ? sections.length : selected + (placement === 'after' ? 1 : 0);
  return [...sections.slice(0, index), section, ...sections.slice(index)];
}
