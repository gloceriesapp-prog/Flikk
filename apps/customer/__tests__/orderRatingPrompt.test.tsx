import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import { fetchReviewForOrder, submitReview, type ApiReview } from '../src/api/reviews';
import { useOrderRating } from '../src/features/order-rating/useOrderRating';
import { useOrderRatingPreview } from '../src/features/order-rating/preview';

const mockSession = { customerId: 'customer-a', sessionEpoch: 1 };
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (s: typeof mockSession) => unknown) => selector(mockSession), { getState: () => mockSession },
) }));
jest.mock('../src/api/reviews', () => ({ fetchReviewForOrder: jest.fn(), submitReview: jest.fn() }));
const saved: ApiReview = { id: 'review-1', order_id: 'order-1', rating: 3, comment: null, created_at: '2026-10-20T10:00:00Z' };
const clients: QueryClient[] = [];

function Surface({ label, preview = false }: { label: string; preview?: boolean }) {
  const state = useOrderRating('order-1', true, preview);
  return state.visible ? <>
    <Pressable accessibilityLabel={label} disabled={state.isSaving} onPress={() => void state.rate(3)}><Text>Rate</Text></Pressable>
    {state.error && <Text>{state.error}</Text>}
  </> : null;
}
function tree(preview = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return <QueryClientProvider client={client}><Surface label="card" preview={preview} /><Surface label="bar" preview={preview} /></QueryClientProvider>;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchReviewForOrder).mockResolvedValue(null);
  jest.mocked(submitReview).mockResolvedValue(saved);
  useOrderRatingPreview.setState({ rating: 0, visible: false });
});
afterEach(async () => {
  await act(async () => {
    clients.splice(0).forEach(client => client.clear());
    await new Promise(resolve => setTimeout(resolve, 0));
  });
});

it('hides both prompts only after a successful save and submits once', async () => {
  let resolve!: (review: ApiReview) => void;
  jest.mocked(submitReview).mockImplementation(() => new Promise(done => { resolve = done; }));
  const view = await render(tree());
  await waitFor(() => expect(view.getByLabelText('card')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('card'));
  expect(view.getByLabelText('bar')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('bar'));
  expect(submitReview).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(saved); });
  await waitFor(() => expect(view.queryByLabelText('card')).toBeNull());
  expect(view.queryByLabelText('bar')).toBeNull();
  expect(submitReview).toHaveBeenCalledTimes(1);
  expect(submitReview).toHaveBeenCalledWith('order-1', 3);
});

it('retains a failed rating prompt for an explicit retry', async () => {
  jest.mocked(submitReview).mockRejectedValueOnce(new Error('offline'));
  const view = await render(tree());
  await waitFor(() => expect(view.getByLabelText('card')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('card'));
  await waitFor(() => expect(view.getByText('Couldn’t save your rating. Tap a star to retry.')).toBeTruthy());
  await fireEvent.press(view.getByLabelText('card'));
  await waitFor(() => expect(view.queryByLabelText('card')).toBeNull());
});

it('dismisses the design sample without contacting the review API', async () => {
  const view = await render(tree(true));
  await fireEvent.press(view.getByLabelText('card'));
  expect(view.queryByLabelText('card')).toBeNull();
  expect(view.queryByLabelText('bar')).toBeNull();
  expect(fetchReviewForOrder).not.toHaveBeenCalled();
  expect(submitReview).not.toHaveBeenCalled();
});

it('keeps an already-rated order hidden when the screen is reopened', async () => {
  jest.mocked(fetchReviewForOrder).mockResolvedValue(saved);
  const view = await render(tree());
  await waitFor(() => expect(fetchReviewForOrder).toHaveBeenCalled());
  expect(view.queryByLabelText('card')).toBeNull();
  expect(view.queryByLabelText('bar')).toBeNull();
  expect(submitReview).not.toHaveBeenCalled();
});

it('reconciles a rating saved elsewhere instead of leaving a repeated prompt', async () => {
  jest.mocked(submitReview).mockRejectedValueOnce(Object.assign(new Error('Already rated'), { code: 'ALREADY_REVIEWED' }));
  const view = await render(tree());
  await waitFor(() => expect(view.getByLabelText('card')).toBeTruthy());
  jest.mocked(fetchReviewForOrder).mockResolvedValue(saved);
  await fireEvent.press(view.getByLabelText('card'));
  await waitFor(() => expect(view.queryByLabelText('card')).toBeNull());
  expect(view.queryByLabelText('bar')).toBeNull();
});
