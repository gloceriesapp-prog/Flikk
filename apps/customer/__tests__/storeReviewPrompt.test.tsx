/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest mocks resolve modules at runtime. */
import { renderHook, waitFor } from '@testing-library/react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStoreReviewPrompt } from '../src/features/store-review/useStoreReviewPrompt';
import { recordIssueReport } from '../src/features/store-review/storage';
import type { ApiOrder } from '../src/api/orders';

jest.mock('expo-store-review', () => ({ isAvailableAsync: jest.fn(async () => true), requestReview: jest.fn(async () => undefined) }));
jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: (select: (s: { customerId: string }) => unknown) => select({ customerId: 'c1' }) }));
const mockHistory = jest.fn();
jest.mock('../src/api/orders', () => ({ fetchOrderHistory: (...args: unknown[]) => mockHistory(...args) }));

const delivered = (id: string) => ({ id, status: 'delivered', trip_id: null, cancel_reason: null, refund_status: 'none', payment_method: 'cod',
  provider_payment_id: null, delivered_at: new Date().toISOString() }) as unknown as ApiOrder;

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

// Real timers: wait out the 2.5 s delay until the hook logs its outcome.
async function settle() {
  await waitFor(() => expect(require('@sentry/react-native').addBreadcrumb).toHaveBeenCalled(), { timeout: 4_000 });
}

it('asks for a review after the delay on a second good order, and remembers it', async () => {
  mockHistory.mockResolvedValue({ items: [delivered('o2'), delivered('o1')], nextCursor: null });
  renderHook(() => useStoreReviewPrompt([delivered('o2')], true));
  expect(StoreReview.requestReview).not.toHaveBeenCalled();
  await settle();
  expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  expect(JSON.parse((await AsyncStorage.getItem('store-review:last-prompt:c1'))!)).toMatchObject({ orderId: 'o2' });
});

it('does nothing on the first delivered order', async () => {
  mockHistory.mockResolvedValue({ items: [delivered('o1')], nextCursor: null });
  renderHook(() => useStoreReviewPrompt([delivered('o1')], true));
  await settle();
  expect(StoreReview.requestReview).not.toHaveBeenCalled();
});

it('skips quietly when the history request fails', async () => {
  mockHistory.mockRejectedValue(new Error('offline'));
  renderHook(() => useStoreReviewPrompt([delivered('o2')], true));
  await settle();
  expect(StoreReview.requestReview).not.toHaveBeenCalled();
});

it('skips an order the customer reported from Help', async () => {
  mockHistory.mockResolvedValue({ items: [delivered('o2'), delivered('o1')], nextCursor: null });
  await recordIssueReport('c1', 'o2');
  renderHook(() => useStoreReviewPrompt([delivered('o2')], true));
  await settle();
  expect(StoreReview.requestReview).not.toHaveBeenCalled();
  expect(require('@sentry/react-native').addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: 'issue_reported' }) }));
});
