import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { fetchPendingPayments } from '../src/api/payments';
import { readAttempt } from '../src/features/checkout-recovery/attemptStorage';
import { beginCheckoutFlow, isCheckoutFlowActive } from '../src/features/checkout-recovery/checkoutActivity';
import { useCheckoutRecovery } from '../src/features/checkout-recovery/useCheckoutRecovery';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({
  navigate: mockNavigate, getState: () => ({ index: 0, routes: [{ name: 'Cart' }] }),
}) }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (state: unknown) => unknown) => selector({ accessToken: 'token' }),
  { getState: () => ({ sessionEpoch: 1 }) },
) }));
jest.mock('../src/payments/openRazorpayCheckout', () => ({ isNativeCheckoutOpen: () => false }));
jest.mock('../src/api/payments', () => ({ fetchPendingPayments: jest.fn() }));
jest.mock('../src/features/checkout-recovery/attemptStorage', () => ({ readAttempt: jest.fn() }));

describe('foreground checkout recovery navigation', () => {
  const initialState = AppState.currentState;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
    jest.mocked(readAttempt).mockResolvedValue(null);
    jest.mocked(fetchPendingPayments).mockResolvedValue([{ orderId: 'saved-order' }]);
  });
  afterEach(() => Object.defineProperty(AppState, 'currentState', { configurable: true, value: initialState }));

  it('does not discover/navigate during an active cart submission', async () => {
    const release = beginCheckoutFlow();
    try {
      const hook = await renderHook(useCheckoutRecovery);
      await act(async () => {});
      expect(readAttempt).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      await hook.unmount();
    } finally { release(); }
  });

  it('does not navigate when checkout starts during a pending discovery request', async () => {
    let resolve!: (targets: { orderId: string }[]) => void;
    jest.mocked(fetchPendingPayments).mockReturnValue(new Promise(done => { resolve = done; }));
    const hook = await renderHook(useCheckoutRecovery);
    await waitFor(() => expect(fetchPendingPayments).toHaveBeenCalled());
    const release = beginCheckoutFlow();
    try {
      await act(async () => { resolve([{ orderId: 'saved-order' }]); });
      expect(mockNavigate).not.toHaveBeenCalled();
      await hook.unmount();
    } finally { release(); }
  });

  it('still recovers a saved payment after checkout ends', async () => {
    const release = beginCheckoutFlow();
    release(); release(); // Idempotent cleanup cannot underflow the guard.
    expect(isCheckoutFlowActive()).toBe(false);
    const hook = await renderHook(useCheckoutRecovery);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PaymentRecovery', { target: { orderId: 'saved-order' } }));
    await hook.unmount();
  });
});
