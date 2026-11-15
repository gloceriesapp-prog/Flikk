import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchOrderHistory, type ApiOrder, type OrderHistoryPage } from '../src/api/orders';
import type { AppStackParamList } from '../src/navigation/types';
import { PurchaseScreen } from '../src/screens/purchase/PurchaseScreen';

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (component: unknown) => component },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedScrollHandler: jest.fn(),
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent, ListFooterComponent }: {
    data: { orderId: string }[];
    renderItem: (args: { item: { orderId: string } }) => React.ReactNode;
    ListHeaderComponent: React.ReactNode;
    ListEmptyComponent: React.ReactNode;
    ListFooterComponent: React.ReactNode;
  }) => {
    const { View } = jest.requireActual('react-native');
    return <View>{ListHeaderComponent}{!data.length && ListEmptyComponent}{data.map(item => <View key={item.orderId}>{renderItem({ item })}</View>)}{ListFooterComponent}</View>;
  },
}));
jest.mock('../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { customerId: string }) => unknown) => selector({ customerId: 'customer-a' }),
}));
jest.mock('../src/api/appConfig', () => ({ useCopy: () => '' }));
jest.mock('../src/api/auth', () => ({ fetchAccountInfo: jest.fn(async () => ({ created_at: '2026-01-01' })) }));
jest.mock('../src/api/orders', () => ({ fetchOrderHistory: jest.fn(), fetchOrderHistoryStatuses: jest.fn() }));
jest.mock('../src/components/BottomNavBar/BottomNavBar', () => ({ BottomNavBar: () => null }));
jest.mock('../src/components/ScreenStatusBar', () => ({ ScreenStatusBar: () => null }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));
jest.mock('../src/screens/purchase/components/PurchaseRecommendations', () => ({
  PurchaseRecommendations: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text>Picked Just For You</Text>;
  },
}));

function order(number: number): ApiOrder {
  return {
    id: `order-${number}`, order_number: `GLO-${number}`, store_id: `store-${number}`,
    status: 'delivered', order_items: [], trip_id: null,
    total: 100, item_total: 100, delivery_fee: 0, commission_amount: 0, discount_amount: 0,
    promo_code_id: null, provider_payment_id: null, payment_method: 'cod',
    cancel_reason: null, refund_status: 'none', provider_refund_id: null, refunded_at: null,
    packed_at: null, picked_up_at: null, delivery_otp: null,
    placed_at: `2026-11-10T0${9 - number}:00:00Z`,
    delivered_at: `2026-11-10T0${9 - number}:30:00Z`,
    stores: { name: `Store ${number}`, avg_prep_minutes: null },
  };
}

it('previews four real orders and exposes the remaining history only after See all', async () => {
  let finishDelivered!: (page: OrderHistoryPage) => void;
  const deliveredResponse = new Promise<OrderHistoryPage>(resolve => { finishDelivered = resolve; });
  jest.mocked(fetchOrderHistory).mockImplementation(async (params, cursor) => {
    if (params.get('status') === 'delivered') return deliveredResponse;
    if (params.get('status') === 'cancelled') return { items: [], nextCursor: null };
    return cursor
      ? { items: [order(6)], nextCursor: null }
      : { items: [1, 2, 3, 4, 5].map(order), nextCursor: 'page-2' };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const props = { navigation: { navigate: jest.fn() } } as unknown as NativeStackScreenProps<AppStackParamList, 'Purchase'>;
  const view = await render(<QueryClientProvider client={client}><PurchaseScreen {...props} /></QueryClientProvider>);
  try {
    await view.findByText('Store 4');
    expect(view.getByText('Picked Just For You')).toBeTruthy();
    expect(view.queryByText('Store 5')).toBeNull();
    expect(view.queryByText('Sample order')).toBeNull();
    expect(fetchOrderHistory).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'See all orders' }));
    expect(view.getByText('Store 5')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'See all orders' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Load more orders' }));
    await view.findByText('Store 6');
    await waitFor(() => expect(view.queryByRole('button', { name: 'Load more orders' })).toBeNull());

    await fireEvent.press(view.getByRole('tab', { name: 'Delivered' }));
    expect(view.getByText('Store 1')).toBeTruthy();
    expect(view.queryByText('Loading orders…')).toBeNull();
    await act(async () => { finishDelivered({ items: [order(1)], nextCursor: null }); });
    await waitFor(() => expect(view.queryByText('Store 6')).toBeNull());

    await fireEvent.press(view.getByRole('tab', { name: 'Cancelled' }));
    await view.findByText(/No orders in this view yet/);
    expect(view.getByText('Picked Just For You')).toBeTruthy();
    expect(view.getByRole('tab', { name: 'Cancelled', selected: true })).toBeTruthy();
    expect(jest.mocked(fetchOrderHistory).mock.lastCall?.[0].get('status')).toBe('cancelled');

    await fireEvent.press(view.getByRole('tab', { name: 'History' }));
    await view.findByText('Store 6');
  } finally {
    await view.unmount();
    client.clear();
  }
});
