export const DEFAULT_FRESH_TABS = { everyday: 'Market Fresh', village: 'Village Fresh' };

// Explicit placement wins over the legacy section IDs and ordering.
export function freshSectionPlacement(section, sections) {
  if (section.freshPlacement) return section.freshPlacement;
  if (section.id === 'home-grown-nearby') return 'village';
  const anchor = sections.findIndex(item => item.id === 'everyday-fresh');
  const index = sections.findIndex(item => item.id === section.id);
  return anchor >= 0 && index <= anchor ? 'intro' : 'everyday';
}
