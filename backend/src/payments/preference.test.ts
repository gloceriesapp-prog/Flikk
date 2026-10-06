import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';

const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: {
  from: mocks.from,
  auth: { admin: { getUserById: mocks.getUser, updateUserById: mocks.updateUser } },
} }));
import { getPaymentPreference, normalizePaymentPreference, savePaymentPreference, selectPaymentPreference } from './preference.js';

const ID = '12345678-1234-1234-1234-123456789012';
function query(result: unknown) {
  const chain = {
    select: vi.fn(), eq: vi.fn(), not: vi.fn(), or: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const name of ['select', 'eq', 'not', 'or', 'order', 'limit'] as const) chain[name].mockReturnValue(chain);
  return chain;
}
function request(body: unknown) {
  return { body, user: { id: 'customer-1' } } as AuthedRequest;
}
function response() {
  return { json: vi.fn() } as unknown as Response;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.updateUser.mockResolvedValue({ error: null });
});
describe('payment preference', () => {
  it('accepts supported methods and never stores an arbitrary app or VPA', () => {
    expect(normalizePaymentPreference('upi_app:gpay')).toBe('upi_app:gpay');
    expect(normalizePaymentPreference('upi_id')).toBe('online');
    expect(normalizePaymentPreference('upi_app:unknown')).toBeNull();
    expect(normalizePaymentPreference('name@bank')).toBeNull();
  });
  it('reads the authenticated customer preference', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: { customer_checkout_payment_method: 'upi_app:phonepe' } } }, error: null });
    const res = response(), next = vi.fn();
    await getPaymentPreference(request({}), res, next);
    expect(mocks.getUser).toHaveBeenCalledWith('customer-1');
    expect(res.json).toHaveBeenCalledWith({ method: 'upi_app:phonepe' });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('falls back to eligible real order history', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: {} } }, error: null });
    const history = query({ data: [{ payment_method: 'cod' }], error: null });
    mocks.from.mockReturnValue(history);
    const res = response();
    await getPaymentPreference(request({}), res, vi.fn());
    expect(history.eq).toHaveBeenCalledWith('customer_id', 'customer-1');
    expect(history.or).toHaveBeenCalledWith('payment_method.eq.cod,razorpay_payment_id.not.is.null');
    expect(res.json).toHaveBeenCalledWith({ method: 'cod' });
  });
  it('cannot save another customer’s order', async () => {
    const order = query({ data: null, error: null });
    mocks.from.mockReturnValue(order);
    const next = vi.fn();
    await savePaymentPreference(request({ method: 'cod', orderId: ID }), response(), next);
    expect(order.eq).toHaveBeenCalledWith('customer_id', 'customer-1');
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404 });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('rejects an unpaid online attempt', async () => {
    mocks.from.mockReturnValue(query({ data: { payment_method: 'online', razorpay_payment_id: null, status: 'placed' }, error: null }));
    const next = vi.fn();
    await savePaymentPreference(request({ method: 'upi_app:gpay', orderId: ID }), response(), next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 409 });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('saves COD after successful placement', async () => {
    mocks.from.mockReturnValue(query({ data: { payment_method: 'cod', razorpay_payment_id: null, status: 'placed' }, error: null }));
    const next = vi.fn();
    await savePaymentPreference(request({ method: 'cod', orderId: ID }), response(), next);
    expect(next).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalledWith('customer-1', { user_metadata: { customer_checkout_payment_method: 'cod' } });
  });
  it('checks a trip’s order leg before remembering a confirmed online provider', async () => {
    mocks.from.mockReturnValueOnce(query({ data: { razorpay_payment_id: 'pay_real', status: 'placed' }, error: null }))
      .mockReturnValueOnce(query({ data: { payment_method: 'online' }, error: null }));
    const next = vi.fn();
    await savePaymentPreference(request({ method: 'upi_app:gpay', tripId: ID }), response(), next);
    expect(next).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalledWith('customer-1', { user_metadata: { customer_checkout_payment_method: 'upi_app:gpay' } });
  });
  it('rejects ambiguous targets and method/order mismatches', async () => {
    const next = vi.fn();
    await savePaymentPreference(request({ method: 'cod', tripId: ID, orderId: ID }), response(), next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 400 });
    mocks.from.mockReturnValue(query({ data: { payment_method: 'online', razorpay_payment_id: 'pay_real', status: 'placed' }, error: null }));
    await savePaymentPreference(request({ method: 'cod', orderId: ID }), response(), next);
    expect(next.mock.calls[1][0]).toMatchObject({ status: 409 });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});

describe('explicit profile payment default', () => {
  it('saves only a display preference for the authenticated customer', async () => {
    const next = vi.fn(), res = response();
    await selectPaymentPreference(request({ method: 'cod' }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalledWith('customer-1', { user_metadata: { customer_checkout_payment_method: 'cod' } });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ method: 'cod' });
  });
  it('rejects account overrides and unsupported providers', async () => {
    for (const body of [{ method: 'cod', customer_id: 'other' }, { method: 'invalid' }]) {
      const next = vi.fn();
      await selectPaymentPreference(request(body), response(), next);
      expect(next.mock.calls[0][0]).toMatchObject({ status: 400 });
    }
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
