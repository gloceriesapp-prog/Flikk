import { catalogueParent, collectionSidebar, filterCollectionCategory } from '../src/screens/home/content/collectionSidebar';
import type { ApiProduct } from '../src/api/products';
const products = [{ id: 'rice', sub_category_id: 'r' }, { id: 'atta', sub_category_id: 'a' }] as ApiProduct[];
const categories = [{ id: 'r', label: 'Rice & Grains' }, { id: 'a', label: 'Atta' }, { id: 'j', label: 'Juices' }];
test('sidebar only contains the selected custom collection catalogue categories', () => {
  expect(collectionSidebar(products, categories, ['r', 'a']).map(item => item.id)).toEqual(['r', 'a']);
  expect(collectionSidebar(products, categories, []).map(item => item.id)).toEqual(['r', 'a']);
});
test('switching sidebar filters the same collection and never substitutes a sibling tile', () => {
  expect(filterCollectionCategory(products, 'all')).toEqual(products);
  expect(filterCollectionCategory(products, 'r').map(item => item.id)).toEqual(['rice']);
  expect(filterCollectionCategory(products, 'j')).toEqual([]);
});

test('uses the real parent category for the standard browser, never a tile ID or title', () => {
  expect(catalogueParent([{ id: 'r', label: 'Rice', parentId: 'pantry' }, { id: 'a', label: 'Atta', parentId: 'pantry' }])).toBe('pantry');
  expect(catalogueParent([])).toBeUndefined();
  expect(catalogueParent([{ id: 'r', label: 'Rice', parentId: 'pantry' }, { id: 'j', label: 'Juice', parentId: 'drinks' }])).toBeUndefined();
});
