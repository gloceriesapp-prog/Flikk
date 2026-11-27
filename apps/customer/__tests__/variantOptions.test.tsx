import { fireEvent, render } from '@testing-library/react-native';
import { ProductVariantOptions } from '../src/components/ProductDetailSheet/ProductVariantOptions';
jest.mock('../src/components/RupeePrice', () => ({ RupeePrice: ({ amount, strike }: { amount: string; strike?: boolean }) => {
  const { Text } = jest.requireActual('react-native'); return <Text>{`${strike ? 'MRP ' : '₹'}${amount}`}</Text>;
} }));
const variants = [
  { id: 'small', label: '500 g', price: 40, originalPrice: 50, unitPriceLabel: '₹8/100 g', availableQuantity: 4 },
  { id: 'large', label: '1 kg', price: 79, originalPrice: 80, availableQuantity: 8 },
  { id: 'sold', label: '2 kg', price: 150, originalPrice: 160, isAvailable: false, availableQuantity: 0 },
];
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));
it('keeps real prices and shows the low-stock strip while selecting a pack', async () => {
  const onSelect = jest.fn();
  const view = await render(<ProductVariantOptions variants={variants} selectedId="small" onSelect={onSelect} deliveryLabel="12 mins" />);
  expect(view.getByText('Select quantity')).toBeTruthy();
  expect(view.getByText('Only 4 left')).toBeTruthy();
  expect(view.queryByText('Only 8 left')).toBeNull();
  expect(view.getByText('₹40')).toBeTruthy();
  expect(view.getByText('MRP 50')).toBeTruthy();
  await fireEvent.press(view.getByRole('radio', { name: '1 kg, ₹79' }));
  expect(onSelect).toHaveBeenCalledWith('large');
});
it('disables sold-out packs without hiding their prices', async () => {
  const onSelect = jest.fn();
  const view = await render(<ProductVariantOptions variants={variants} selectedId="small" onSelect={onSelect} />);
  expect(view.getByText('₹150')).toBeTruthy();
  expect(view.getByText('MRP 160')).toBeTruthy();
  expect(view.getByText('Out of stock')).toBeTruthy();
  await fireEvent.press(view.getByRole('radio', { name: '2 kg, ₹150', disabled: true }));
  expect(onSelect).not.toHaveBeenCalled();
});
