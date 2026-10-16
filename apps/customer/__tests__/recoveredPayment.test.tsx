import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useRecoveredPayment } from '../src/screens/payment-method/useRecoveredPayment';
import { abandonCheckout, createPaymentOrder, recoverPayment, verifyPayment } from '../src/api/payments';
import { prepareUpiIntent } from '../src/payments/upiIntent';
import { openRazorpayCheckout } from '../src/payments/openRazorpayCheckout';
const mockReplace = jest.fn(), mockRefetch = jest.fn();
let mockEpoch = 1;
const mockRecovery = { data: { state: 'unpaid', canResumeUpiIntent: false, record: { total: 63 } }, isFetchedAfterMount: true, isFetching: false, isError: false, refetch: mockRefetch };
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => mockRecovery }));
jest.mock('../src/api/payments', () => ({ abandonCheckout: jest.fn(), createPaymentOrder: jest.fn(), recoverPayment: jest.fn(), verifyPayment: jest.fn() }));
jest.mock('../src/payments/upiIntent', () => ({ prepareUpiIntent: jest.fn() }));
jest.mock('../src/payments/openRazorpayCheckout', () => ({ openRazorpayCheckout: jest.fn() }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: Object.assign(
  (selector: (state: unknown) => unknown) => selector({ customerId: 'customer' }),
  { getState: () => ({ sessionEpoch: mockEpoch }) },
) }));
const target = { orderId: 'same-order' };
const navigation = { replace: mockReplace } as unknown as Parameters<typeof useRecoveredPayment>[1];
beforeEach(() => {
  jest.clearAllMocks(); mockEpoch = 1;
  mockRecovery.data.state = 'unpaid'; mockRecovery.data.canResumeUpiIntent = false;
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'unpaid', record: { id: 'same-order', total: 63, status: 'pending', provider_payment_id: null } });
  jest.mocked(prepareUpiIntent).mockResolvedValue({ amountPaise: 6300, expiresAt: '2026-10-15T00:00:00Z' } as Awaited<ReturnType<typeof prepareUpiIntent>>);
});
it('never starts a payment simply by rendering the recovered chooser', async () => {
  await renderHook(() => useRecoveredPayment(target, navigation));
  expect(prepareUpiIntent).not.toHaveBeenCalled();
  expect(createPaymentOrder).not.toHaveBeenCalled();
});
it('reconciles and mounts processing for the existing order before UPI handoff', async () => {
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(prepareUpiIntent).toHaveBeenCalledWith(target, 'upi_app:phonepe');
  expect(mockReplace).toHaveBeenCalledWith('PaymentProcessing', expect.objectContaining({ target, recovered: true, amount: 63, paymentMethod: 'upi_app:phonepe' }));
  expect(openRazorpayCheckout).not.toHaveBeenCalled();
});
it('blocks a second payment when reconciliation discovers pending capture', async () => {
  jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'pending', record: { id: 'same-order', total: 63, status: 'pending', provider_payment_id: null } });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(prepareUpiIntent).not.toHaveBeenCalled();
  expect(hook.result.current.error).toMatch(/still being checked/);
});
it('does not launch if the payment-session amount differs from the existing order', async () => {
  jest.mocked(prepareUpiIntent).mockResolvedValue({ amountPaise: 6500 } as Awaited<ReturnType<typeof prepareUpiIntent>>);
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(hook.result.current.error).toMatch(/amount changed/);
});
it('cancels through the coordinated backend operation for the same order', async () => {
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.cancel());
  expect(abandonCheckout).toHaveBeenCalledWith(target, 'cancel');
  expect(mockReplace).toHaveBeenCalledWith('PaymentRecovery', { target });
});
it('checks a native callback on the server before returning to reconciliation', async () => {
  const order = { providerOrderId: 'provider-order' } as Awaited<ReturnType<typeof createPaymentOrder>>;
  const callback = { razorpay_payment_id: 'payment' } as Awaited<ReturnType<typeof openRazorpayCheckout>>;
  jest.mocked(createPaymentOrder).mockResolvedValue(order);
  jest.mocked(openRazorpayCheckout).mockResolvedValue(callback);
  jest.mocked(verifyPayment).mockResolvedValue({ ok: false });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('card'));
  expect(verifyPayment).toHaveBeenCalledWith(target, callback);
  expect(mockReplace).toHaveBeenCalledWith('PaymentRecovery', { target });
});
it('ignores a late provider response after the account changes', async () => {
  jest.mocked(prepareUpiIntent).mockImplementation(async () => { mockEpoch = 2; return { amountPaise: 6300 } as Awaited<ReturnType<typeof prepareUpiIntent>>; });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(mockReplace).not.toHaveBeenCalled();
});
it('resumes only a provider-confirmed existing UPI intent while pending', async () => {
  jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'pending', canResumeUpiIntent: true,
    record: { id: 'same-order', total: 63, status: 'pending', provider_payment_id: null } });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(prepareUpiIntent).toHaveBeenCalledWith(target, 'upi_app:phonepe');
  expect(mockReplace).toHaveBeenCalledWith('PaymentProcessing', expect.objectContaining({ target, recovered: true }));
  expect(createPaymentOrder).not.toHaveBeenCalled();
});
it('does not open card checkout for a resumable pending UPI intent', async () => {
  jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'pending', canResumeUpiIntent: true,
    record: { id: 'same-order', total: 63, status: 'pending', provider_payment_id: null } });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('card'));
  expect(createPaymentOrder).not.toHaveBeenCalled();
  expect(openRazorpayCheckout).not.toHaveBeenCalled();
  expect(prepareUpiIntent).not.toHaveBeenCalled();
});
it('does not resume a pending UPI payment once the provider no longer permits it', async () => {
  jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'pending', canResumeUpiIntent: false,
    record: { id: 'same-order', total: 63, status: 'pending', provider_payment_id: null } });
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  await act(() => hook.result.current.select('upi_app:phonepe'));
  expect(prepareUpiIntent).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it.each([true, false])('enables the pending UPI chooser only when the backend resume flag is %s', async allowed => {
  mockRecovery.data.state = 'pending'; mockRecovery.data.canResumeUpiIntent = allowed;
  const hook = await renderHook(() => useRecoveredPayment(target, navigation));
  expect(hook.result.current.canResumeUpi).toBe(allowed);
  expect(hook.result.current.canPay).toBe(allowed);
});
