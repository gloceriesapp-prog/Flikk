import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { fetchOrderHistory, type ApiOrder } from '../src/api/orders';
import { fetchReviewForOrder, submitReview } from '../src/api/reviews';
import { DeliveryRatingPrompt } from '../src/features/order-rating/DeliveryRatingPrompt';

jest.mock('../src/store/useAuthStore', () => {
  const session = { customerId: 'customer-a', sessionEpoch: 1 };
  return { useAuthStore: Object.assign(
    (selector: (state: typeof session) => unknown) => selector(session), { getState: () => session },
  ) };
});
jest.mock('../src/api/orders', () => ({ fetchOrderHistory: jest.fn() }));
jest.mock('../src/api/reviews', () => ({ fetchReviewForOrder: jest.fn(), submitReview: jest.fn() }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

function order(id: string, status: ApiOrder['status'], hour: string, store: string): ApiOrder {
  return {
    id, status, order_number: id, order_items: [], trip_id: null, store_id: store,
    total: 100, item_total: 100, delivery_fee: 0, commission_amount: 0, discount_amount: 0,
    promo_code_id: null, provider_payment_id: null, payment_method: 'cod',
    cancel_reason: null, refund_status: 'none', provider_refund_id: null, refunded_at: null,
    packed_at: null, picked_up_at: null, delivery_otp: null,
    placed_at: `2026-11-10T${hour}:00:00Z`,
    delivered_at: status === 'delivered' ? `2026-11-10T${hour}:30:00Z` : null,
    stores: { name: store, avg_prep_minutes: null },
  };
}

it('skips rated and active orders, returns after Later on reopening, and stays hidden after submission', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const reviewed = { id: 'review-a', order_id: 'rated', rating: 4, comment: null, created_at: '2026-11-10T09:30:00Z' };
  jest.mocked(fetchOrderHistory).mockResolvedValue({ items: [
    order('in-flight', 'packed', '10', 'Active shop'),
    order('rated', 'delivered', '09', 'Rated shop'),
    order('pending', 'delivered', '08', 'Pending shop'),
  ], nextCursor: null });
  jest.mocked(fetchReviewForOrder).mockImplementation(async id => id === 'rated' ? reviewed : null);
  jest.mocked(submitReview).mockResolvedValue({ ...reviewed, id: 'review-b', order_id: 'pending' });

  let notify!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
    notify = callback;
    return { remove: jest.fn() };
  });
  const reopen = async () => {
    await act(async () => {
      notify('background');
      notify('inactive');
      notify('active');
    });
  };

  try {
    const view = await render(<QueryClientProvider client={client}><DeliveryRatingPrompt enabled /></QueryClientProvider>);
    await view.findByText('Rate your order from Pending shop.');
    expect(fetchReviewForOrder).not.toHaveBeenCalledWith('in-flight');
    await fireEvent.press(view.getByRole('button', { name: 'Later' }));
    expect(view.queryByText('How was your delivery?')).toBeNull();

    await reopen();
    await view.findByText('Rate your order from Pending shop.');
    await fireEvent.press(view.getByLabelText('Rate 4 out of 5'));
    await fireEvent.changeText(view.getByLabelText('Add an optional comment'), '  Arrived on time.  ');
    await fireEvent.press(view.getByRole('button', { name: 'Submit rating' }));
    await waitFor(() => expect(view.queryByText('How was your delivery?')).toBeNull());
    expect(submitReview).toHaveBeenCalledWith('pending', 4, 'Arrived on time.');

    await reopen();
    await waitFor(() => expect(client.getQueryData(['delivery-rating-candidate', 'customer-a', 2, ['rated', 'pending']])).toBeNull());
    expect(view.queryByText('How was your delivery?')).toBeNull();
    await view.unmount();
  } finally {
    listener.mockRestore();
    client.clear();
  }
});
