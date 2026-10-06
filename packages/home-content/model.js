export const TAB_KEYS = ['grocery', 'fresh', 'regional'];
export const SECTION_KINDS = [
  'products',
  'categories',
  'brands',
  'stores',
  'banner',
  'hero',
  'footer',
];
export const createSelection = () => ({
  mode: 'automatic',
  productIds: [],
  categoryIds: [],
  storeIds: [],
  includeTerms: [],
  excludeTerms: [],
  discountedOnly: false,
});
export function createSection(kind, id, title = '') {
  return {
    id,
    kind,
    title,
    subtitle: '',
    enabled: true,
    layout: 'horizontal',
    columns: 3,
    limit: 6,
    backgroundColor: '',
    imageUrl: '',
    imageAspectRatio: 2,
    imageFade: false,
    buttonEnabled: false,
    buttonLabel: 'Explore more',
    hideWhenEmpty: false,
    selection: createSelection(),
    items: [],
  };
}
export function createItem(id, title = '') {
  return {
    id,
    title,
    enabled: true,
    imageUrl: '',
    backgroundColor: '#EEF4E5',
    description: '',
    origin: '',
    selection: createSelection(),
  };
}
