import { fireEvent, render } from '@testing-library/react-native';
import { FlavourPickerSheet } from '../src/components/FlavourPicker/FlavourPickerSheet';
import { ProductCardView } from '../src/screens/home/products/ProductCardView';
import { addToCart } from '../src/store/addToCart';
import type { Product } from '../src/screens/home/products/types';
jest.mock('../src/store/addToCart', () => ({ addToCart: jest.fn() }));
jest.mock('../src/store/useCartStore', () => ({ useCartStore: (selector: (state: unknown) => unknown) => selector({ items: [], incrementItem: jest.fn(), decrementItem: jest.fn() }) }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('../src/components/ProductImageGallery', () => ({ ProductImageGallery: () => null }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/icons/IconlyClose', () => ({ IconlyClose: () => null }));
jest.mock('../src/components/RupeePrice', () => ({ RupeePrice: ({ amount }: { amount: number }) => {
  const { Text } = jest.requireActual('react-native'); return <Text>{`₹${amount}`}</Text>;
} }));
const product = { id: 'milk', name: 'Badam Milk', price: 20, weight: '170 ml', storeId: 'shop', defaultVariantId: 'small',
  options: [{ id: 'mango', name: 'Mango Milk', isAvailable: true, prices: { small: { price: 32, originalPrice: 35 } } },
    { id: 'rose', name: 'Rose Milk', isAvailable: false }] } as Product;
beforeEach(() => jest.clearAllMocks());
it('routes Add separately from the unchanged product tap', async () => {
  const onAdd = jest.fn(), onPress = jest.fn(), stopPropagation = jest.fn();
  const view = await render(<ProductCardView product={product} onPress={onPress} onAdd={onAdd} estimatedMinutes={29} isAvailable />);
  await fireEvent.press(view.getByRole('button', { name: 'Add Badam Milk to cart' }), { stopPropagation });
  expect(stopPropagation).toHaveBeenCalled(); expect(onAdd).toHaveBeenCalledTimes(1); expect(onPress).not.toHaveBeenCalled();
  await fireEvent.press(view.getByText('Badam Milk')); expect(onPress).toHaveBeenCalledTimes(1);
});
it('adds the chosen price/identity, retains the original, and blocks sold-out flavours', async () => {
  const view = await render(<FlavourPickerSheet product={product} visible onClose={jest.fn()} isAvailable />);
  expect(view.getByRole('header', { name: 'Badam Milk' })).toBeTruthy(); expect(view.getByText('₹32')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Add Mango Milk, 170 ml to cart' }));
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'small', optionId: 'mango', price: 32, originalPrice: 35 }), undefined);
  await fireEvent.press(view.getByRole('button', { name: 'Add Rose Milk, 170 ml to cart' })); expect(addToCart).toHaveBeenCalledTimes(1);
  await fireEvent.press(view.getByRole('button', { name: 'Add Badam Milk, 170 ml to cart' }));
  expect(addToCart).toHaveBeenLastCalledWith(expect.objectContaining({ optionId: undefined, price: 20 }), undefined);
});
