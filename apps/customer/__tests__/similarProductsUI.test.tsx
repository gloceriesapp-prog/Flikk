import { fireEvent, render } from '@testing-library/react-native';
import { SimilarProductsRow } from '../src/components/ProductDetailSheet/SimilarProductsRow';
import { ProductFlavourOptions } from '../src/components/ProductDetailSheet/ProductFlavourOptions';
import { useSimilarProducts } from '../src/components/ProductDetailSheet/useSimilarProducts';
import type { Product } from '../src/screens/home/products/types';
jest.mock('../src/components/ProductDetailSheet/useSimilarProducts', () => ({ useSimilarProducts: jest.fn() }));
jest.mock('../src/screens/home/products/ProductCardView', () => ({ SelfServiceProductCardView: ({ product, onPress }: { product: Product; onPress: () => void }) => {
  const { Text: Label } = jest.requireActual('react-native');
  return <Label accessibilityRole="button" onPress={onPress}>{product.name}</Label>;
} }));
jest.mock('../src/components/icons/iconly', () => ({ IconlyArrowLeft: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: jest.requireActual('react-native').View }));
const product = (id: number) => ({ id: `${id}`, name: `Drink ${id}`, categoryLabel: 'Drinks' } as Product);
const query = { data: { pages: [{ products: Array.from({ length: 9 }, (_, i) => product(i + 1)) }] }, hasNextPage: false,
  isFetching: false, isError: false, isFetchingNextPage: false, isFetchNextPageError: false, fetchNextPage: jest.fn(), refetch: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); (useSimilarProducts as jest.Mock).mockReturnValue(query); });
it('shows six preview cards and opens the full list only through See all', async () => {
  const onSelect = jest.fn();
  const view = await render(<SimilarProductsRow product={product(0)} onSelect={onSelect} />);
  expect(view.getByRole('header', { name: 'You may also like' })).toBeTruthy();
  expect(view.queryByText('Drink 7')).toBeNull();
  await fireEvent.press(view.getByText('See all recommendations'));
  expect(view.getByText('Drink 7')).toBeTruthy();
  await fireEvent.press(view.getByText('Drink 7'));
  expect(onSelect).toHaveBeenCalledWith(product(7));
});
it('hides See all for six or fewer recommendations and retries a failed request', async () => {
  (useSimilarProducts as jest.Mock).mockReturnValue({ ...query, data: { pages: [{ products: [product(1)] }] } });
  const view = await render(<SimilarProductsRow product={product(0)} />);
  expect(view.queryByText('See all recommendations')).toBeNull();
  (useSimilarProducts as jest.Mock).mockReturnValue({ ...query, data: undefined, isError: true });
  await view.rerender(<SimilarProductsRow product={product(0)} />);
  await fireEvent.press(view.getByText('Couldn’t load recommendations. Tap to retry.'));
  expect(query.refetch).toHaveBeenCalled();
});
it('preserves flavour selection and disables unavailable choices in the new placement', async () => {
  const onSelect = jest.fn();
  const options = [{ id: 'mango', name: 'Mango', isAvailable: true }, { id: 'rose', name: 'Rose', isAvailable: false }];
  const view = await render(<ProductFlavourOptions options={options} selectedId="mango" onSelect={onSelect} />);
  expect(view.getByRole('radio', { name: 'Mango' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getByRole('radio', { name: 'Rose, out of stock' }));
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('radio', { name: 'Mango' }));
  expect(onSelect).toHaveBeenCalledWith('mango');
});

it('moves the active indicator from the main item to an added flavour and back', async () => {
  const React = jest.requireActual('react');
  function Picker() {
    const [selected, setSelected] = React.useState('main-product');
    return <ProductFlavourOptions options={[
      { id: 'main-product', name: 'Badam Milk', isAvailable: true },
      { id: 'mango', name: 'Mango Milk', isAvailable: true },
    ]} selectedId={selected} onSelect={setSelected} />;
  }
  const view = await render(<Picker />);
  expect(view.getByRole('radio', { name: 'Badam Milk' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(view.getByRole('radio', { name: 'Mango Milk' }));
  expect(view.getByRole('radio', { name: 'Mango Milk' }).props.accessibilityState.selected).toBe(true);
  expect(view.getByRole('radio', { name: 'Badam Milk' }).props.accessibilityState.selected).toBe(false);
  await fireEvent.press(view.getByRole('radio', { name: 'Badam Milk' }));
  expect(view.getByRole('radio', { name: 'Badam Milk' }).props.accessibilityState.selected).toBe(true);
});
