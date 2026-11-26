import { act, fireEvent, render } from '@testing-library/react-native';
import { ProductCardView } from '../src/screens/home/products/ProductCardView';
import { notchedCardMetrics, notchedCardPath } from '../src/screens/home/products/image-area/notchedCardGeometry';
import { PanResponder, type PanResponderCallbacks, type PanResponderGestureState, type GestureResponderEvent } from 'react-native';
import type { Product } from '../src/screens/home/products/types';

const mockCart = { items: [] as { id: string; quantity: number }[], incrementItem: jest.fn(), decrementItem: jest.fn() };
jest.mock('../src/store/useCartStore', () => ({ useCartStore: (selector: (state: typeof mockCart) => unknown) => selector(mockCart) }));
jest.mock('../src/store/addToCart', () => ({ addToCart: jest.fn() }));
jest.mock('../src/components/AppImage', () => ({ AppImage: jest.requireActual('react-native').Image }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
const product = { id: 'onion', name: 'Onion', price: 30, originalPrice: 40, weight: '1 kg', storeId: 'store', isVeg: true, availableQuantity: 3 } as Product;
beforeEach(() => { jest.clearAllMocks(); mockCart.items = []; });

it.each([360, 430])('keeps a finite rounded notch at %ipx through the complete quantity animation', viewport => {
  for (const width of [(viewport - 64) / 3, (viewport - 52) / 2, (viewport - 48) / 3.2]) {
    const { diameter, height, pillWidth } = notchedCardMetrics(width);
    expect(diameter).toBeGreaterThanOrEqual(40);
    expect(diameter).toBeCloseTo(Math.max(40, width * 0.28));
    for (const frame of [0, 0.25, 0.5, 0.75, 1]) {
      const path = notchedCardPath(width, height, diameter, (pillWidth - diameter) * frame);
      expect(path).not.toMatch(/NaN|Infinity/);
      expect(path.match(/A8 8/g)).toHaveLength(2);
      expect(path).toMatch(/A16 16/);
    }
  }
});
it('keeps cart controls independent from opening the product', async () => {
  const open = jest.fn(), choose = jest.fn(), stopPropagation = jest.fn();
  const view = await render(<ProductCardView product={product} isAvailable onPress={open} onAdd={choose} />);
  expect(view.queryByRole('button', { name: /wishlist/ })).toBeNull();
  expect(open).not.toHaveBeenCalled();
  mockCart.items = [{ id: 'onion', quantity: 5 }];
  await view.rerender(<ProductCardView product={{ ...product }} isAvailable onPress={open} onAdd={choose} />);
  await fireEvent.press(view.getByRole('button', { name: 'Increase quantity of Onion' }), { stopPropagation });
  await fireEvent.press(view.getByRole('button', { name: 'Decrease quantity of Onion' }), { stopPropagation });
  expect(mockCart.incrementItem).toHaveBeenCalledWith('onion');
  expect(mockCart.decrementItem).toHaveBeenCalledWith('onion');
  await fireEvent.press(view.getByText('Onion'));
  expect(open).toHaveBeenCalledTimes(1);
});
it('keeps price, stock and image height when no Add action is available', async () => {
  const view = await render(<ProductCardView product={{ ...product, isVeg: undefined }} isAvailable={false} availabilityLabel="Out of stock" />);
  expect(view.queryByLabelText('Vegetarian')).toBeNull();
  expect(view.queryByLabelText('Non-vegetarian')).toBeNull();
  expect(view.getByText('₹30')).toBeTruthy();
  expect(view.getByText('₹40')).toBeTruthy();
  expect(view.getByText('Out of stock')).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Add Onion to cart' })).toBeNull();
  expect(view.getByTestId('product-image-onion').props.style.aspectRatio).toBe(4 / 4.5);
});

it('keeps horizontal photo paging while leaving vertical browsing gestures alone', async () => {
  let callbacks: PanResponderCallbacks = {};
  const spy = jest.spyOn(PanResponder, 'create').mockImplementation(config => { callbacks = config; return { panHandlers: {} }; });
  try {
    const view = await render(<ProductCardView product={{ ...product, imageUrls: ['photo-a', 'photo-b'] }} isAvailable />);
    await fireEvent(view.getByTestId('product-image-onion'), 'layout', { nativeEvent: { layout: { width: 100, height: 112.5 } } });
    expect(view.getByLabelText('Vegetarian')).toBeTruthy();
    expect(view.getByLabelText('Photo 1 of 2')).toBeTruthy();
    const event = {} as GestureResponderEvent;
    const horizontal = { dx: -70, dy: 1, vx: -0.5 } as PanResponderGestureState;
    expect(callbacks.onMoveShouldSetPanResponder?.(event, horizontal)).toBe(true);
    expect(callbacks.onMoveShouldSetPanResponder?.(event, { ...horizontal, dx: 1, dy: 70 })).toBe(false);
    await act(() => {
      callbacks.onPanResponderGrant?.(event, horizontal);
      callbacks.onPanResponderMove?.(event, horizontal);
      callbacks.onPanResponderRelease?.(event, horizontal);
    });
    expect(view.getByLabelText('Photo 2 of 2')).toBeTruthy();
  } finally { spy.mockRestore(); }
});

// React Native releases synthetic events before queued state updaters may run.
it('captures layout width before the native event is released', async () => {
  const view = await render(<ProductCardView product={product} isAvailable />);
  const onLayout = view.getByTestId('product-image-onion').props.onLayout;
  await act(() => {
    for (const width of [100, 130]) {
      const event: { nativeEvent: { layout: { width: number } } | null } = { nativeEvent: { layout: { width } } };
      onLayout(event);
      event.nativeEvent = null;
    }
  });
  expect(view.getByTestId('product-photo-pager').props.style.width).toBe(130);
  await act(() => { onLayout({ nativeEvent: null }); onLayout({ nativeEvent: { layout: { width: 0 } } }); });
  expect(view.getByTestId('product-photo-pager').props.style.width).toBe(130);
});
