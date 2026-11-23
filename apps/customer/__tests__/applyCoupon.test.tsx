import type { ComponentProps } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ApplyCouponScreen } from '../src/screens/coupons/ApplyCouponScreen';
import { PromoCodeCard } from '../src/screens/cart/components/PromoCodeCard';
import { validatePromoCode } from '../src/api/promos';
import { useCartStore } from '../src/store/useCartStore';
import type { CartItem } from '../src/store/useCartStore';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/icons/IconlyDiscountTag', () => ({ IconlyDiscountTag: () => null }));
jest.mock('../src/components/icons/IconlyClose', () => ({ IconlyClose: () => null }));
jest.mock('../src/api/promos', () => ({ validatePromoCode: jest.fn() }));
jest.mock('../src/store/useAuthStore', () => ({
  useAuthStore: { getState: () => ({ customerId: 'customer-1' }) },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const validate = jest.mocked(validatePromoCode);
const goBack = jest.fn();
const props = {
  navigation: { goBack },
  route: { key: 'coupon', name: 'ApplyCoupon', params: { itemTotal: 200 } },
} as unknown as ComponentProps<typeof ApplyCouponScreen>;
const items = [{ id: 'rice', productId: 'rice', name: 'Rice', price: 100, quantity: 2 }] as CartItem[];

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.setState({ items: [...items], appliedPromo: null });
});

it('opens the coupon page from the complete Cart offer row', async () => {
  const onOpen = jest.fn();
  const view = await render(<PromoCodeCard appliedPromo={null} onOpen={onOpen} />);
  await fireEvent.press(view.getByRole('button', { name: 'View all coupons and offers' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(view.getByText('Coupons & Offers')).toBeTruthy();
  expect(view.queryByPlaceholderText('Enter promo code')).toBeNull();
});

it('disables applying an empty code and displays the custom code form', async () => {
  const view = await render(<ApplyCouponScreen {...props} />);
  expect(view.getByRole('button', { name: 'Apply coupon', disabled: true })).toBeTruthy();
  expect(view.getByText('Apply Coupon')).toBeTruthy();
  expect(view.getByText('No Coupons Available')).toBeTruthy();
});

it('validates a normalized code and returns to Cart after applying it', async () => {
  validate.mockResolvedValue({ discountAmount: 25 });
  const view = await render(<ApplyCouponScreen {...props} />);
  await fireEvent.changeText(view.getByLabelText('Coupon code'), ' save25 ');
  await fireEvent.press(view.getByRole('button', { name: 'Apply coupon' }));
  expect(validate).toHaveBeenCalledWith('SAVE25', 200);
  expect(useCartStore.getState().appliedPromo).toEqual({ code: 'SAVE25', discountAmount: 25 });
  expect(goBack).toHaveBeenCalledTimes(1);
});

it('keeps invalid codes on the page and shows the server reason', async () => {
  validate.mockResolvedValue({ error: 'This code has expired.' });
  const view = await render(<ApplyCouponScreen {...props} />);
  await fireEvent.changeText(view.getByLabelText('Coupon code'), 'expired');
  await fireEvent.press(view.getByRole('button', { name: 'Apply coupon' }));
  expect(view.getByText('This code has expired.')).toBeTruthy();
  expect(useCartStore.getState().appliedPromo).toBeNull();
  expect(goBack).not.toHaveBeenCalled();
});

it('discards a validation result if the cart changes during the request', async () => {
  let finish!: (result: { discountAmount: number }) => void;
  validate.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = await render(<ApplyCouponScreen {...props} />);
  await fireEvent.changeText(view.getByLabelText('Coupon code'), 'save25');
  await fireEvent.press(view.getByRole('button', { name: 'Apply coupon' }));
  await act(async () => {
    useCartStore.setState({ items: [{ ...items[0]!, quantity: 3 }] });
    finish({ discountAmount: 25 });
  });
  expect(view.getByText('Your cart changed. Return to Checkout and try again.')).toBeTruthy();
  expect(useCartStore.getState().appliedPromo).toBeNull();
  expect(goBack).not.toHaveBeenCalled();
});

it('shows the quoted savings and removes the applied coupon', async () => {
  const appliedPromo = { code: 'SAVE25', discountAmount: 25 };
  useCartStore.setState({ appliedPromo });
  const view = await render(<PromoCodeCard appliedPromo={appliedPromo} quotedDiscount={20} onOpen={jest.fn()} />);
  expect(view.getByText('SAVE25 applied · ₹20.00 saved')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Remove promo code' }));
  expect(useCartStore.getState().appliedPromo).toBeNull();
});
