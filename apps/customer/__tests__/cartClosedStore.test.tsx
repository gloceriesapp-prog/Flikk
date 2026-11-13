import { fireEvent, render } from '@testing-library/react-native';
import { CartPaymentBar } from '../src/screens/cart/components/CartPaymentBar';
import { productAvailability } from '../src/utils/productAvailability';
import { useCartStore } from '../src/store/useCartStore';
import type { Product } from '../src/screens/home/products/types';
import { StoreClosedNotice } from '../src/screens/cart/components/StoreClosedNotice';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/api/appConfig', () => ({ useCopy: () => 'Place order' }));

it('blocks ordering for a closed store even if other checkout inputs are ready', async () => {
  const onPlaceOrder = jest.fn();
  const onChoose = jest.fn();
  const view = await render(<CartPaymentBar method="cod" apps={[]} total={26} busy={false}
    disabled={false} storeClosed onChoose={onChoose} onPlaceOrder={onPlaceOrder} />);
  const button = view.getByRole('button', { name: 'Store closed', disabled: true });
  await fireEvent.press(button);
  expect(onPlaceOrder).not.toHaveBeenCalled();
  expect(onChoose).not.toHaveBeenCalled();
  expect(view.queryByText('Checking total…')).toBeNull();
  await view.rerender(<CartPaymentBar method="cod" apps={[]} total={26} busy={false}
    disabled={false} storeClosed={false} onChoose={onChoose} onPlaceOrder={onPlaceOrder} />);
  await fireEvent.press(view.getByRole('button', { name: 'Place order, total ₹26' }));
  expect(onPlaceOrder).toHaveBeenCalledTimes(1);
});

it('explains closed-shop cart behavior in a single notice', async () => {
  const view = await render(<StoreClosedNotice />);
  expect(view.getByText('Ordering is paused')).toBeTruthy();
  expect(view.getByText('A store in your cart is closed. Keep adding items and place your order when it reopens.')).toBeTruthy();
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
