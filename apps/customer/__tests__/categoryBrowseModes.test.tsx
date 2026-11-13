import { render } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { HomeContentCollectionScreen } from '../src/screens/home/content/HomeContentCollectionScreen';
import { createItem, createSection } from '../src/screens/home/content/contracts';
const mockTile = createItem('tile', 'Rice & Atta');
const mockSection = createSection('categories', 'categories');
mockSection.items = [mockTile];
const mockProducts = [{ id: 'rice', name: 'Rice', category: 'Pantry', sub_category_id: 'rice-sub', store_id: 'store', price: 10, original_price: null }];
jest.mock('../src/screens/home/content/useHomeContent', () => ({ useHomeContent: () => ({ data: [{ tabKey: 'grocery', content: { enabled: true, sections: [mockSection] } }] }) }));
jest.mock('../src/screens/home/content/useCollectionInventory', () => ({ useCollectionInventory: () => ({ visibleProducts: mockProducts, hasLocation: true }) }));
jest.mock('../src/screens/home/content/useCollectionCategories', () => ({ useCollectionCategories: () => ({ data: [{ id: 'rice-sub', label: 'Rice', parentId: 'pantry' }] }) }));
jest.mock('../src/screens/home/content/productMapping', () => ({ mapContentProduct: (product: unknown) => product }));
jest.mock('../src/screens/category-detail/CategoryDetailScreen', () => ({ CategoryDetailContent: (props: { categoryId: string }) => {
  const { Text } = jest.requireActual('react-native'); return <Text testID="normal-category">{props.categoryId}</Text>;
} }));
jest.mock('../src/components/ScreenStatusBar', () => ({ ScreenStatusBar: () => null }));
jest.mock('../src/screens/category-detail/components/CategoryDetailHeader', () => ({ CategoryDetailHeader: () => null }));
jest.mock('../src/screens/category-detail/components/SubCategorySidebarItem', () => ({ SubCategorySidebarItem: () => {
  const { Text } = jest.requireActual('react-native'); return <Text>Sidebar entry</Text>;
} }));
jest.mock('../src/screens/category-detail/filters/CategoryFilterBar', () => ({ CategoryFilterBar: () => null }));
jest.mock('../src/screens/category-detail/filters/CategoryFilterSheet', () => ({ CategoryFilterSheet: () => null }));
jest.mock('../src/screens/category-detail/filters/productFilters', () => ({ DEFAULT_FILTERS: {}, filterProducts: (products: unknown) => products, getTypeOptions: () => [] }));
jest.mock('../src/screens/home/groceries/components/GroceryProductTile', () => ({ GroceryProductTile: () => null }));
jest.mock('../src/screens/home/content/ContentState', () => ({ ContentState: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: (props: { numColumns: number }) => {
  const { Text } = jest.requireActual('react-native'); return <Text testID="columns">{props.numColumns}</Text>;
} }));
const props = { route: { key: 'tile-route', params: { tabKey: 'grocery', sectionId: 'categories', itemId: 'tile' } }, navigation: { goBack: jest.fn(), navigate: jest.fn() } } as unknown as ComponentProps<typeof HomeContentCollectionScreen>;
test('catalogue tile reuses the real parent category browser', async () => {
  mockTile.selection.mode = 'automatic'; mockTile.selection.categoryIds = ['rice-sub'];
  const view = await render(<HomeContentCollectionScreen {...props} />);
  expect(view.getByTestId('normal-category').props.children).toBe('pantry');
  expect(view.queryByTestId('columns')).toBeNull();
});
test('custom product collection has three columns and no sidebar', async () => {
  mockTile.selection.mode = 'manual'; mockTile.selection.productIds = ['rice']; mockTile.selection.categoryIds = [];
  const view = await render(<HomeContentCollectionScreen {...props} />);
  expect(view.getByTestId('columns').props.children).toBe(3);
  expect(view.queryByText('Sidebar entry')).toBeNull();
  expect(view.queryByTestId('normal-category')).toBeNull();
});
