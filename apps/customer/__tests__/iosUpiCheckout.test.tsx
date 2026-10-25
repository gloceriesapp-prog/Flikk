import { AppState, NativeModules, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useRecoveredPayment } from '../src/screens/payment-method/useRecoveredPayment';
import { createPaymentOrder, createUpiIntentSession, fetchPaymentAvailability, recoverPayment, verifyPayment } from '../src/api/payments';

const mockRefetch = jest.fn();
let mockRecovery: Record<string, unknown>;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mockRecovery, isFetchedAfterMount: true, isError: false, isFetching: false, refetch: mockRefetch }) }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (state: unknown) => unknown) => selector({ customerId: 'customer' }),
  { getState: () => ({ sessionEpoch: 1 }) },
) }));
jest.mock('../src/features/checkout-recovery/checkoutActivity', () => ({ beginCheckoutFlow: () => jest.fn() }));
jest.mock('../src/api/payments', () => ({ createPaymentOrder: jest.fn(), createUpiIntentSession: jest.fn(), fetchPaymentAvailability: jest.fn(), recoverPayment: jest.fn(), verifyPayment: jest.fn() }));
const target = { orderId: 'owned-order' };
const providerOrder = () => ({ provider: 'razorpay' as const, providerOrderId: 'order_abc', keyId: 'rzp_test_abc', amount: 63, amountPaise: 6300, currency: 'INR' as const, environment: 'sandbox' as const, expiresAt: new Date(Date.now() + 60000).toISOString() });
const evidence = { razorpay_order_id: 'order_abc', razorpay_payment_id: 'pay_abc', razorpay_signature: 'a'.repeat(64) };
const previousOS = Platform.OS;
const previousNative = NativeModules.RNRazorpayCheckout;
const previousUpi = NativeModules.UpiApps;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  NativeModules.RNRazorpayCheckout = { open: jest.fn() };
  NativeModules.UpiApps = { launchPaymentIntent: jest.fn() };
  mockRecovery = { state: 'unpaid', record: { total: 63 } };
  jest.mocked(recoverPayment).mockImplementation(async () => mockRecovery as never);
  jest.mocked(createPaymentOrder).mockResolvedValue(providerOrder());
  jest.mocked(RazorpayCheckout.open).mockResolvedValue(evidence);
  jest.mocked(verifyPayment).mockResolvedValue({ ok: true });
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: previousOS });
  NativeModules.RNRazorpayCheckout = previousNative;
  NativeModules.UpiApps = previousUpi;
});
async function setup() {
  const navigation = { replace: jest.fn() };
  const hook = await renderHook(() => useRecoveredPayment(target, navigation as never));
  return { ...hook, navigation };
}
it('pays an existing iOS order through native UPI checkout and verifies the same order', async () => {
  const { result, navigation } = await setup();
  await act(async () => result.current.select('upi_app:gpay'));
  expect(createPaymentOrder).toHaveBeenCalledWith(target);
  expect(createUpiIntentSession).not.toHaveBeenCalled();
  expect(RazorpayCheckout.open).toHaveBeenCalledWith(expect.objectContaining({ order_id: 'order_abc', amount: 6300,
    config: { display: { blocks: { upi_only: { name: 'Pay with UPI', instruments: [{ method: 'upi' }] } }, sequence: ['block.upi_only'], preferences: { show_default_blocks: false } } },
  }));
  expect(verifyPayment).toHaveBeenCalledWith(target, evidence);
  expect(navigation.replace).toHaveBeenCalledWith('PaymentRecovery', { target });
});
it('does not start another iOS payment while an Android intent remains pending', async () => {
  mockRecovery = { state: 'pending', canResumeUpiIntent: true, record: { total: 63 } };
  const { result } = await setup();
  expect(result.current.canResumeUpi).toBe(false);
  await act(async () => result.current.select('upi_app:phonepe'));
  expect(createPaymentOrder).not.toHaveBeenCalled();
  expect(createUpiIntentSession).not.toHaveBeenCalled();
  expect(RazorpayCheckout.open).not.toHaveBeenCalled();
  expect(result.current.error).toContain('still being checked');
});
it('retains recovery and never claims success when iOS native checkout is cancelled', async () => {
  jest.mocked(RazorpayCheckout.open).mockRejectedValue({ reason: 'payment_cancelled' });
  const { result } = await setup();
  await act(async () => result.current.select('upi_app:phonepe'));
  expect(verifyPayment).not.toHaveBeenCalled();
  expect(result.current.error).toContain('cancelled');
  expect(mockRefetch).toHaveBeenCalled();
});
it('preserves Android provider-created intent flow', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  jest.mocked(fetchPaymentAvailability).mockResolvedValue({ online: true, cod: true, min_order_value: 0, upi_intent: true });
  jest.mocked(createUpiIntentSession).mockResolvedValue({ provider: 'razorpay', providerOrderId: 'order_abc', providerPaymentId: 'pay_abc', amountPaise: 6300, currency: 'INR', expiresAt: new Date(Date.now()+60000).toISOString(), intentUrl: 'upi://pay?pa=merchant%40bank&tr=reference&am=63.00&cu=INR' });
  const { result, navigation } = await setup();
  await act(async () => result.current.select('upi_app:phonepe'));
  expect(createUpiIntentSession).toHaveBeenCalledWith(target);
  expect(createPaymentOrder).not.toHaveBeenCalled();
  expect(RazorpayCheckout.open).not.toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('PaymentProcessing', expect.objectContaining({ target, upiIntent: expect.any(Object) }));
});
