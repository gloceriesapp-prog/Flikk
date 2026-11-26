// Fresh tab choices, in the order the app shows them. `everyday` keeps its
// original key (saved documents and older apps use it) and now reads
// "Vegetables"; `fruits` was added later, so saved titles may lack it.
export const FRESH_CHOICES = ['everyday', 'fruits', 'village'];
export const DEFAULT_FRESH_TABS = { everyday: 'Vegetables', fruits: 'Fruits', village: 'Village Fresh' };

// A choice's title: the saved one, else the default.
export function freshTabTitle(tabs, choice) {
  return (tabs && typeof tabs[choice] === 'string' && tabs[choice].trim()) || DEFAULT_FRESH_TABS[choice];
}

// Explicit placement wins over the legacy section IDs and ordering.
// 'both' predates the third choice and means every choice.
export function freshSectionPlacement(section, sections) {
  if (section.freshPlacement) return section.freshPlacement;
  if (section.id === 'home-grown-nearby') return 'village';
  if (section.id === 'fruit-favourites') return 'fruits';
  const anchor = sections.findIndex(item => item.id === 'everyday-fresh');
  const index = sections.findIndex(item => item.id === section.id);
  return anchor >= 0 && index <= anchor ? 'intro' : 'everyday';
}
