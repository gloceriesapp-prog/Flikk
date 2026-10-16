import { AppState } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { PaymentRecoveryScreen } from '../src/features/checkout-recovery/PaymentRecoveryScreen';
import { readAttempt, findAttempt, clearAttempt } from '../src/features/checkout-recovery/attemptStorage';
const mockReplace = jest.fn(), mockRefetch = jest.fn(), mockClear = jest.fn();
let mockEpoch = 1;
let mockQuery: Record<string, unknown>;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => mockQuery }));
jest.mock('../src/api/payments', () => ({ recoverPayment: jest.fn() }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (state: unknown) => unknown) => selector({ customerId: 'customer' }),
  { getState: () => ({ sessionEpoch: mockEpoch }) },
) }));
jest.mock('../src/store/useCartStore', () => ({ useCartStore: { getState: () => ({ items: [], appliedPromo: null, clear: mockClear }) } }));
jest.mock('../src/store/cartIdentity', () => ({ checkoutItems: (items: unknown) => items }));
jest.mock('../src/features/checkout-recovery/attemptStorage', () => ({ readAttempt: jest.fn(), findAttempt: jest.fn(), clearAttempt: jest.fn() }));
const props = () => ({ route: { params: { target: { orderId: 'order' } } }, navigation: { replace: mockReplace, navigate: jest.fn() } }) as unknown as Parameters<typeof PaymentRecoveryScreen>[0];
const data = (state: string) => ({ state, record: { id: 'order', total: 63 } });
beforeEach(() => {
  jest.clearAllMocks(); mockEpoch = 1;
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  mockQuery = { data: data('unpaid'), isFetchedAfterMount: true, isFetching: false, isError: false, refetch: mockRefetch };
  jest.mocked(readAttempt).mockResolvedValue(null);
});
it('opens the existing method picker for the same unpaid order without the extra page', async () => {
  const screen = await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('PaymentMethod', { selectedMethod: null, recoveryTarget: { orderId: 'order' } }));
  expect(screen.queryByText('Your order is saved')).toBeNull();
});
it.each(['pending', 'reconciling'])('opens the safe chooser while %s without charging', async state => {
  mockQuery.data = data(state);
  const screen = await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('PaymentMethod', { selectedMethod: null, recoveryTarget: { orderId: 'order' } }));
  expect(screen.queryByText('Continue payment')).toBeNull();
});
it('does not use cached recovery state before the mount check finishes', async () => {
  mockQuery.isFetchedAfterMount = false;
  await render(<PaymentRecoveryScreen {...props()} />);
  expect(mockReplace).not.toHaveBeenCalled();
});
it('clears only the matching paid attempt and cart before showing the order', async () => {
  mockQuery.data = data('paid');
  jest.mocked(readAttempt).mockResolvedValue({ id: 'attempt', cartKey: JSON.stringify({ items: [], promo: null }) } as Awaited<ReturnType<typeof readAttempt>>);
  jest.mocked(findAttempt).mockResolvedValue({ kind: 'order', result: { id: 'order' }, abandoned: false });
  await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('OrderSummary', { orderId: 'order', isTrip: false }));
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(clearAttempt).toHaveBeenCalledWith('attempt');
});
it('preserves a newer cart after payment', async () => {
  mockQuery.data = data('paid');
  jest.mocked(readAttempt).mockResolvedValue({ id: 'attempt', cartKey: 'different' } as Awaited<ReturnType<typeof readAttempt>>);
  jest.mocked(findAttempt).mockResolvedValue({ kind: 'order', result: { id: 'order' }, abandoned: false });
  await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  expect(mockClear).not.toHaveBeenCalled();
});
it.each(['expired', 'cancelled'])('returns %s checkout to the cart', async state => {
  mockQuery.data = data(state);
  await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('Cart'));
});
it('does not navigate across an account change', async () => {
  mockQuery.data = data('paid');
  jest.mocked(readAttempt).mockImplementation(async () => { mockEpoch = 2; return null; });
  await render(<PaymentRecoveryScreen {...props()} />);
  await waitFor(() => expect(readAttempt).toHaveBeenCalled());
  expect(mockReplace).not.toHaveBeenCalled();
});
