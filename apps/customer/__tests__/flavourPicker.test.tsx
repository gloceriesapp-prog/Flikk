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
it('shows the reference ADD layout without counting flavours as pack sizes', async () => {
  const view = await render(<ProductCardView product={product} onAdd={jest.fn()} onPress={jest.fn()} isAvailable />);
  expect(view.getByRole('button', { name: 'Add Badam Milk to cart' })).toBeTruthy();
  expect(view.queryByText('ADD')).toBeNull();
  expect(view.queryByText(/\(\d+ options?\)/)).toBeNull();
  expect(view.getByText('170 ml')).toBeTruthy();
});
it('opens pack selection instead of silently adding the default size', async () => {
  const onPress = jest.fn(), stopPropagation = jest.fn();
  const sized = { ...product, options: undefined, variants: [{ id: 'small', label: '170 ml', price: 20 }, { id: 'large', label: '500 ml', price: 50 }] };
  const view = await render(<ProductCardView product={sized} onPress={onPress} isAvailable />);
  expect(view.getByText('(1 option)')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Add Badam Milk to cart' }), { stopPropagation });
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(addToCart).not.toHaveBeenCalled();
});
it('keeps single-pack quick add and out-of-stock behavior', async () => {
  const plain = { ...product, options: undefined };
  const view = await render(<ProductCardView product={plain} isAvailable />);
  expect(view.queryByText(/\(\d+ options?\)/)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Add Badam Milk to cart' }), { stopPropagation: jest.fn() });
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'small', price: 20, weight: '170 ml' }));
  await view.rerender(<ProductCardView product={plain} isAvailable={false} availabilityLabel="Out of stock" />);
  expect(view.queryByRole('button', { name: 'Add Badam Milk to cart' })).toBeNull();
  expect(view.getByText('₹20')).toBeTruthy();
  expect(view.getByText('Out of stock')).toBeTruthy();
});

it('counts additional distinct sizes below the weight', async () => {
  const sized = { ...product, options: undefined, sizeOptions: ['170 ml', '500 ml', '500 ML'], imageUrls: ['one', 'two', 'three'] };
  const view = await render(<ProductCardView product={sized} isAvailable />);
  expect(view.getByText('(1 option)')).toBeTruthy();
});

it('pluralizes additional sizes and hides the label when there is no weight', async () => {
  const sized = { ...product, options: undefined, sizeOptions: ['170 ml', '500 ml', '1 L'] };
  const view = await render(<ProductCardView product={sized} isAvailable />);
  expect(view.getByText('(2 options)')).toBeTruthy();
  await view.rerender(<ProductCardView product={{ ...sized, weight: '' }} isAvailable />);
  expect(view.queryByText(/\(\d+ options?\)/)).toBeNull();
});
