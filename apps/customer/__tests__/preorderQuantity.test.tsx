import { fireEvent, render } from '@testing-library/react-native';
import { ProductDetailFooter } from '../src/components/ProductDetailSheet/ProductDetailFooter';
import { addToCart } from '../src/store/addToCart';
import { useCartStore } from '../src/store/useCartStore';
import type { Product } from '../src/screens/home/products/types';
jest.mock('../src/store/addToCart', () => ({ addToCart: jest.fn() }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
const product = { id: 'chicken', name: 'Chicken', price: 100, originalPrice: 120, weight: '0.5 kg',
  storeId: 'shop', defaultVariantId: 'half', availableQuantity: 5, totalAvailableQuantity: 5,
  preorder: { minQty: 1, leadDays: 0 } } as Product;
const booking = { date: '2026-11-15', slotId: 'morning', label: 'Tomorrow morning' };
beforeEach(() => { jest.clearAllMocks(); useCartStore.getState().clear(); });
it('shows the chosen kg amount and total, but sends the real unit price to the cart', async () => {
  const view = await render(<ProductDetailFooter product={product} preorder={booking} />);
  await fireEvent.press(view.getByLabelText('Increase pre-order quantity'));
  expect(view.getByText('2 × 0.5 kg · minimum 1')).toBeTruthy();
  expect(view.getByLabelText('₹200, MRP ₹240, 17% off')).toBeTruthy();
  await fireEvent.press(view.getByText('Add pre-order'));
  expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ price: 100, weight: '0.5 kg', variantId: 'half' }), booking, 2);
});
it('stops at shared stock, even when another size is already in the cart', async () => {
  useCartStore.getState().addItem({ id: 'other', productId: product.id, variantId: 'large', name: 'Chicken', weight: '1 kg', price: 200, storeId: 'shop', preorderMinQty: 1 }, booking, 3);
  const view = await render(<ProductDetailFooter product={product} preorder={booking} />);
  await fireEvent.press(view.getByLabelText('Increase pre-order quantity'));
  expect(view.getByLabelText('Increase pre-order quantity').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(view.getByLabelText('Increase pre-order quantity'));
  expect(view.getByText('2 × 0.5 kg · minimum 1')).toBeTruthy();
});
it('keeps the minimum and requires the existing day/slot selection for pieces', async () => {
  const idli = { ...product, name: 'Idli', weight: '1 pc', preorder: { minQty: 10, leadDays: 0 }, availableQuantity: 30, totalAvailableQuantity: 30 };
  const view = await render(<ProductDetailFooter product={idli} />);
  expect(view.getByText('10 × 1 pc · minimum 10')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Decrease pre-order quantity'));
  expect(view.getByText('10 × 1 pc · minimum 10')).toBeTruthy();
  expect(view.getByText('Pick day & slot')).toBeTruthy();
  expect(addToCart).not.toHaveBeenCalled();
});
it('resets the pending amount when a different real pack is selected', async () => {
  const view = await render(<ProductDetailFooter product={product} preorder={booking} />);
  await fireEvent.press(view.getByLabelText('Increase pre-order quantity'));
  await view.rerender(<ProductDetailFooter product={product} selectedVariant={{ id: 'large', label: '1 kg', price: 180, availableQuantity: 5 }} preorder={booking} />);
  expect(view.getByText('1 × 1 kg · minimum 1')).toBeTruthy();
});
