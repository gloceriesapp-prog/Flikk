import { fireEvent, render } from '@testing-library/react-native';
import { StoreDetailScreen } from '../src/screens/store-detail/StoreDetailScreen';
import { useStoreProducts } from '../src/screens/store-detail/useStoreProducts';
import type { StoreProductFilters } from '../src/screens/store-detail/useStoreProducts';
jest.mock('../src/screens/store-detail/useStoreProducts', () => ({ useStoreProducts: jest.fn() }));
jest.mock('../src/api/appConfig', () => ({ useCopy: () => 'Shop by category' }));
jest.mock('../src/components/ScreenStatusBar', () => ({ ScreenStatusBar: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('../src/screens/store-detail/components/StoreDetailHeader', () => ({ StoreDetailHeader: () => null }));
jest.mock('../src/screens/store-detail/components/StoreProductFilterBar', () => ({ StoreProductFilterBar: () => null }));
jest.mock('../src/screens/store-detail/components/StoreSortSheet', () => ({ StoreSortSheet: () => null }));
jest.mock('../src/screens/store-detail/components/StorePriceRangeSheet', () => ({ StorePriceRangeSheet: () => null }));
jest.mock('../src/screens/search/components/SearchHeader', () => ({ SearchHeader: () => null }));
jest.mock('../src/screens/home/products/ProductCard', () => ({ ProductCard: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: ({ ListHeaderComponent }: { ListHeaderComponent: React.ReactNode }) => ListHeaderComponent }));
const categories = [{ id: 'all', label: 'All' }, { id: 'drinks', label: 'Drinks' }, { id: 'snacks', label: 'Snacks' }];
let filters: StoreProductFilters;
it('shows real subcategories above products and clears the child filter when the parent changes', async () => {
  jest.mocked(useStoreProducts).mockImplementation((_store, selected) => {
    filters = selected;
    return { categories, products: [], subcategories: selected.category === 'drinks' ? [{ id: 'milk', label: 'Milk' }, { id: 'juice', label: 'Juice' }] : [],
      categoriesQuery: {}, subcategoriesQuery: {},
    } as unknown as ReturnType<typeof useStoreProducts>;
  });
  const props = { navigation: { goBack: jest.fn(), navigate: jest.fn() }, route: { params: { storeId: 'shop', storeName: 'Our shop' } } };
  const view = await render(<StoreDetailScreen {...props as unknown as React.ComponentProps<typeof StoreDetailScreen>} />);
  const drinks = view.getAllByRole('button', { name: 'Drinks' });
  await fireEvent.press(drinks[0]!);
  expect(filters!.category).toBe('drinks');
  await fireEvent.press(view.getByRole('button', { name: 'Milk' }));
  expect(filters!.subcategory).toBe('milk');
  await fireEvent.press(view.getByRole('button', { name: 'All Drinks' }));
  expect(filters!.subcategory).toBe('all');
  await fireEvent.press(view.getByRole('button', { name: 'Juice' }));
  await fireEvent.press(view.getByRole('button', { name: 'Snacks' }));
  expect(filters!).toMatchObject({ category: 'snacks', subcategory: 'all' });
  expect(view.queryByRole('button', { name: 'Juice' })).toBeNull();
});
