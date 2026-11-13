import type { ComponentProps } from 'react';
import { render } from '@testing-library/react-native';
import { CategoryDetailScreen } from '../src/screens/category-detail/CategoryDetailScreen';
const mockCategory = jest.fn((_id: string) => ({ data: undefined }));
const mockSubcategory = jest.fn((_id: string | undefined) => ({ data: undefined }));
let mockPending = true;
jest.mock('../src/screens/category-detail/useRealCategoryDetail', () => ({
  useRealSubCategories: () => ({ isPending: mockPending, data: mockPending ? undefined : [{ id: 'sub', label: 'Juice' }] }),
  useCategoryProducts: (id: string) => mockCategory(id),
  useSubCategoryProducts: (id: string | undefined) => mockSubcategory(id),
}));
jest.mock('../src/components/ScreenStatusBar', () => ({ ScreenStatusBar: () => null }));
jest.mock('../src/screens/category-detail/components/CategoryDetailHeader', () => ({ CategoryDetailHeader: () => null }));
jest.mock('../src/screens/category-detail/components/SubCategorySidebar', () => ({ SubCategorySidebar: () => null }));
jest.mock('../src/screens/category-detail/components/CategoryProductPane', () => ({ CategoryProductPane: () => null }));

it('opens the chosen subcategory immediately instead of first fetching all category products', async () => {
  const props = { route: { params: { categoryId: '00000000-0000-4000-8000-000000000071', label: 'Juice', subcategoryId: 'sub' } }, navigation: { goBack: jest.fn(), navigate: jest.fn() } };
  const view = await render(<CategoryDetailScreen {...props as unknown as ComponentProps<typeof CategoryDetailScreen>} />);
  expect(mockCategory).toHaveBeenLastCalledWith('');
  expect(mockSubcategory).toHaveBeenLastCalledWith('sub');
  mockPending = false;
  await view.rerender(<CategoryDetailScreen {...props as unknown as ComponentProps<typeof CategoryDetailScreen>} />);
  expect(mockSubcategory).toHaveBeenLastCalledWith('sub');
});
