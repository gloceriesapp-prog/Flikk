import { fireEvent, render } from '@testing-library/react-native';
import { CartPaymentBar } from '../src/screens/cart/components/CartPaymentBar';
import { productAvailability } from '../src/utils/productAvailability';
import { useCartStore } from '../src/store/useCartStore';
import type { Product } from '../src/screens/home/products/types';
import { StoreClosedNotice } from '../src/screens/cart/components/StoreClosedNotice';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/api/appConfig', () => ({ useCopy: () => 'Proceed to Payment' }));

it('blocks checkout for a closed store and otherwise proceeds to payment', async () => {
  const onProceed = jest.fn();
  const view = await render(<CartPaymentBar total={26} busy={false} disabled={false} storeClosed onProceed={onProceed} />);
  await fireEvent.press(view.getByRole('button', { name: 'Store closed', disabled: true }));
  expect(onProceed).not.toHaveBeenCalled();
  await view.rerender(<CartPaymentBar total={26} busy={false} disabled storeClosed={false} onProceed={onProceed} />);
  await fireEvent.press(view.getByRole('button', { name: 'Proceed to Payment', disabled: true }));
  expect(onProceed).not.toHaveBeenCalled();
  await view.rerender(<CartPaymentBar total={26} busy={false} disabled={false} storeClosed={false} onProceed={onProceed} />);
  expect(view.getByText('Total amount')).toBeTruthy();
  expect(view.getByText('₹26')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Proceed to Payment' }));
  expect(onProceed).toHaveBeenCalledTimes(1);
});

it('explains closed-shop cart behavior in a single notice', async () => {
  const view = await render(<StoreClosedNotice />);
  expect(view.getByText('Store is closed')).toBeTruthy();
  expect(view.getByText('Your cart is saved. You can keep adding items and place your order when the store reopens.')).toBeTruthy();
});

it('keeps stocked products addable and quantities editable while their shop is closed', () => {
  useCartStore.getState().clear();
  const product = { id: 'milk', name: 'Milk', price: 50, weight: '1 L', storeId: 'closed-shop',
    isAvailable: true, storeOpening: { isActive: false, openTime: '09:00', closeTime: '21:30' } } as Product;
  expect(productAvailability(product)).toEqual({ isAvailable: true, label: undefined });
  useCartStore.getState().addItem({ ...product, productId: product.id, storeId: 'closed-shop' });
  expect(useCartStore.getState().items).toHaveLength(1);
  useCartStore.getState().incrementItem('milk');
  expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  useCartStore.getState().clear();
});
