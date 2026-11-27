import { NativeModules, Platform } from 'react-native';
import { checkCashfreeOrder, hasCashfreeSdk, openCashfreeCheckout } from '../src/payments/openCashfreeCheckout';
import { createPaymentOrder, type CashfreeOrder } from '../src/api/payments';

const mockGateway = { setCallback: jest.fn(), removeCallback: jest.fn(), doUPIPayment: jest.fn(), doWebPayment: jest.fn() };
jest.mock('react-native-cashfree-pg-sdk', () => ({ CFPaymentGatewayService: mockGateway }), { virtual: false });
jest.mock('cashfree-pg-api-contract', () => ({
  CFEnvironment: { SANDBOX: 'SANDBOX', PRODUCTION: 'PRODUCTION' },
  CFSession: jest.fn().mockImplementation((id: string, orderId: string, env: string) => ({ id, orderId, env })),
  CFUPIIntentCheckoutPayment: jest.fn().mockImplementation((session: unknown) => ({ upi: session })),
}));
const mockRequest = jest.fn();
jest.mock('../src/api/client', () => ({ apiRequest: (...args: unknown[]) => mockRequest(...args) }));


const order: CashfreeOrder = { provider: 'cashfree', providerOrderId: `gl_${'a'.repeat(32)}`, paymentSessionId: 'session_abcdefghij',
  amount: 123.45, amountPaise: 12345, currency: 'INR', environment: 'sandbox', expiresAt: '2099-01-01T00:00:00Z' };

beforeEach(() => { jest.clearAllMocks(); (NativeModules as Record<string, unknown>).CashfreePgApi = {}; });
afterEach(() => { delete (NativeModules as Record<string, unknown>).CashfreePgApi; });

it('only claims Cashfree support when the native module is present', async () => {
  expect(hasCashfreeSdk()).toBe(true);
  delete (NativeModules as Record<string, unknown>).CashfreePgApi;
  expect(hasCashfreeSdk()).toBe(false);
  await expect(openCashfreeCheckout(order)).rejects.toThrow('latest Gloceries app build');
  mockRequest.mockResolvedValue({});
  await createPaymentOrder({ orderId: 'o1' });
  expect(mockRequest).toHaveBeenLastCalledWith('/payments/create-order', { method: 'POST', body: { orderId: 'o1', provider: 'razorpay' } });
  await createPaymentOrder({ orderId: 'o1' }, true);
  expect(mockRequest).toHaveBeenLastCalledWith('/payments/create-order', { method: 'POST', body: { orderId: 'o1', provider: 'auto', supports: ['razorpay', 'cashfree'] } });
});

it('rejects tampered or expired payment details before opening anything', () => {
  for (const bad of [{ providerOrderId: 'order_x' }, { amountPaise: 12346 }, { currency: 'USD' }, { paymentSessionId: '' }, { environment: 'live' }])
    expect(() => checkCashfreeOrder({ ...order, ...bad } as CashfreeOrder)).toThrow('could not be verified');
  expect(() => checkCashfreeOrder({ ...order, expiresAt: '2000-01-01T00:00:00Z' })).toThrow('expired');
});

it('opens web checkout and resolves only for the same order (server still verifies)', async () => {
  mockGateway.doWebPayment.mockImplementation(() => mockGateway.setCallback.mock.calls[0][0].onVerify(order.providerOrderId));
  await expect(openCashfreeCheckout(order, 'card')).resolves.toBeUndefined();
  expect(mockGateway.doWebPayment).toHaveBeenCalledWith({ id: 'session_abcdefghij', orderId: order.providerOrderId, env: 'SANDBOX' });
  expect(mockGateway.removeCallback).toHaveBeenCalled();
});

it('uses the native UPI intent sheet for a chosen UPI app on Android', async () => {
  Platform.OS = 'android';
  mockGateway.doUPIPayment.mockImplementation(() => mockGateway.setCallback.mock.calls[0][0].onVerify(order.providerOrderId));
  await openCashfreeCheckout(order, 'upi_app:gpay' as never);
  expect(mockGateway.doUPIPayment).toHaveBeenCalled();
  expect(mockGateway.doWebPayment).not.toHaveBeenCalled();
});

it('reports cancel and failure without claiming payment, and allows a later retry', async () => {
  mockGateway.doWebPayment.mockImplementation(() => mockGateway.setCallback.mock.calls.at(-1)[0].onError({ getCode: () => 'action_cancelled', getMessage: () => 'cancelled' }, order.providerOrderId));
  await expect(openCashfreeCheckout(order)).rejects.toThrow('cancelled');
  mockGateway.doWebPayment.mockImplementation(() => mockGateway.setCallback.mock.calls.at(-1)[0].onVerify(`gl_${'b'.repeat(32)}`));
  await expect(openCashfreeCheckout(order)).rejects.toThrow('needs checking');
});
