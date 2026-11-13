import { fireEvent, render } from '@testing-library/react-native';
import { GroceryCategoryGrid } from '../src/screens/home/groceries/shop-by-category/GroceryCategoryGrid';
import { createItem } from '../src/screens/home/content/contracts';
import { categoryTileProducts } from '../src/screens/home/content/categoryTileProducts';
import type { ApiProduct } from '../src/api/products';
jest.mock('../src/components/AppImage', () => ({ AppImage: (props: unknown) => {
  const { View } = jest.requireActual('react-native');
  return <View {...props as object} testID="category-artwork" />;
} }));

it('uses the standard category dimensions with four equal cells, two-line labels and uncropped art', async () => {
  const items = Array.from({ length: 5 }, (_, i) => createItem(`tile-${i}`, i === 0 ? 'Rice & Atta' : `Tile ${i}`));
  const onOpen = jest.fn();
  const view = await render(<GroceryCategoryGrid items={items} imageForItem={() => 'https://images.gloceries.com/rice.png'} onOpen={onOpen} />);
  for (const cell of view.getAllByTestId('grocery-category-cell')) expect(cell.props.style.width).toBe('25%');
  const image = view.getAllByTestId('category-artwork')[0]!;
  expect(image.props.resizeMode).toBe('contain');
  expect(image.props.style).toMatchObject({ width: '90%', height: '90%' });
  expect(image.parent!.props.style).toMatchObject({ aspectRatio: 0.85, borderRadius: 18 });
  await fireEvent.press(view.getByRole('button', { name: 'Shop Rice & Atta' }));
  expect(onOpen).toHaveBeenCalledWith(items[0]);
  await view.rerender(<GroceryCategoryGrid items={items} columns={3} imageForItem={() => undefined} onOpen={onOpen} />);
  expect(view.getAllByTestId('grocery-category-cell')[0]!.props.style.width).toBe(`${100 / 3}%`);
});
it('matches chosen catalogue scope rather than the custom title and never leaks unrelated products', () => {
  const products = [
    { id: 'r', name: 'Rice', sub_category_id: 'rice', category: 'Grains' },
    { id: 'a', name: 'Atta', sub_category_id: 'atta', category: 'Flour' },
    { id: 'j', name: 'Rice brand juice', sub_category_id: 'juice', category: 'Drinks' },
  ] as unknown as ApiProduct[];
  const tile = createItem('custom', 'Pantry favourites');
  tile.selection.categoryIds = ['rice', 'atta'];
  expect(categoryTileProducts(products, [tile]).map(p => p.id)).toEqual(['r', 'a']);
  tile.selection = { ...tile.selection, mode: 'manual', productIds: ['j'], categoryIds: [] };
  expect(categoryTileProducts(products, [tile]).map(p => p.id)).toEqual(['j']);
  tile.selection.productIds = [];
  expect(categoryTileProducts(products, [tile])).toEqual([]);
  tile.selection.mode = 'automatic';
  expect(categoryTileProducts(products, [tile])).toEqual([]);
});
