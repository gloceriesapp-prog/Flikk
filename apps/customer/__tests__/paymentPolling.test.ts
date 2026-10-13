import { AppState } from 'react-native';
import { recoverPayment } from '../src/api/payments';
import { paymentCheckDeadline, pollOrderPaid, POLL_TIMEOUT_SECONDS } from '../src/payments/pollOrderPaid';

jest.mock('../src/api/payments', () => ({ recoverPayment: jest.fn() }));
const target = { orderId: 'local-order-id' };

describe('payment reconciliation across suspension', () => {
  const initialState = AppState.currentState;
  beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(1_000_000);
    jest.mocked(recoverPayment).mockReset();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  });
  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: initialState });
  });
  it('caps its visible budget at the backend reservation expiry', () => {
    expect(paymentCheckDeadline(new Date(Date.now() + 30_000).toISOString())).toBe(Date.now() + 30_000);
    expect(paymentCheckDeadline(new Date(Date.now() + 600_000).toISOString())).toBe(Date.now() + POLL_TIMEOUT_SECONDS * 1000);
  });
  it('never treats pending as paid and terminates at a wall-clock deadline', async () => {
    jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'pending', record: { id: 'x', total: 10, status: 'placed', provider_payment_id: null } });
    const pending = pollOrderPaid(target, Date.now() + 5000);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBe(false);
    expect(recoverPayment).toHaveBeenCalledTimes(2);
  });
  it('does not query while backgrounded and does not extend the deadline', async () => {
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
    const pending = pollOrderPaid(target, Date.now() + 5000);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBe(false);
    expect(recoverPayment).not.toHaveBeenCalled();
  });
  it('stops polling when the screen unmounts', async () => {
    const controller = new AbortController();
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
    const pending = pollOrderPaid(target, Date.now() + 120_000, controller.signal);
    controller.abort();
    await expect(pending).resolves.toBe(false);
    expect(recoverPayment).not.toHaveBeenCalled();
  });
  it('returns success only for backend-confirmed capture', async () => {
    jest.mocked(recoverPayment).mockResolvedValue({ target, state: 'paid', record: { id: 'x', total: 10, status: 'placed', provider_payment_id: 'pay_real' } });
    await expect(pollOrderPaid(target)).resolves.toBe(true);
  });
});
