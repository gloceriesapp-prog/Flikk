import { beforeEach, expect, it, vi } from 'vitest';
import type { NextFunction, RequestHandler, Response, Router } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { AppError } from './errors.js';
import { calculateCheckoutBill } from './checkoutQuote.js';
const mocks = vi.hoisted(() => ({ confirm: vi.fn(), rpc: vi.fn(), address: vi.fn() }));
vi.mock('./checkoutQuoteService.js', () => ({ confirmCheckoutQuote: mocks.confirm }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.rpc, from: () => {
  const query = { select: () => query, eq: () => query, single: async () => ({ data: null, error: null }) }; return query;
} } }));
vi.mock('../middleware/auth.js', () => ({ requireAuth: vi.fn(), requireRole: () => vi.fn(), requireApproved: vi.fn() }));
vi.mock('./resolveAddress.js', () => ({ resolveAddressId: mocks.address }));
// Per-store commission (migration 115): shop-b has its own 5% rate, every other store the 10% default.
const { storeRate } = vi.hoisted(() => ({ storeRate: (id: string) => ({ rate: id === 'shop-b' ? 0.05 : 0.1, isStoreOverride: id === 'shop-b' }) }));
vi.mock('./platformSettings.js', () => ({
  getStoreCommissionRate: async (id: string) => storeRate(id),
  getStoreCommissionRates: async (ids: string[]) => new Map(ids.map((id) => [id, storeRate(id)])),
}));
vi.mock('./pushNotifications.js', async (importOriginal) => ({ ...(await importOriginal<typeof import('./pushNotifications.js')>()), sendPushNotification: vi.fn() }));
vi.mock('./riderDispatch.js', () => ({ triggerDispatch: vi.fn() }));
vi.mock('../payments/refundPayment.js', () => ({ refundPayment: vi.fn() }));
vi.mock('../routes/stores.js', () => ({ PRODUCT_WITH_VARIANTS_SELECT: '*' }));
vi.mock('./checkoutAttempts.js', () => ({
  checkoutAttemptIdentity: () => ({ id: 'attempt', fingerprint: 'cart' }),
  findCheckoutAttempt: async () => null,
  commitCheckoutAttempt: async (_customer: string, _identity: unknown, kind: string, args: unknown) => {
    const result = await mocks.rpc(kind === 'order' ? 'create_order' : 'create_trip_orders', args);
    return { ...result, data: { result: result.data, replayed: false } };
  },
}));
import { ordersRouter } from '../routes/orders.js';
import { tripsRouter } from '../routes/trips.js';
const line = (shop: string, variant: string) => ({ product_id: 'rice', variant_id: variant, quantity: 1, store_id: shop,
  unit_price_at_order: 40, unit_at_order: '1 kg', variant_mrp_at_order: 50 });
const settings = { flatDeliveryFee: 20, handlingFee: 5, freeDeliveryEnabled: false, freeDeliveryThreshold: 100, estimatedDeliveryMinutes: 35 };
async function place(router: Router, body: Record<string, unknown>) {
  const layers = router.stack as { route?: { path: string; methods: { post?: boolean }; stack: { handle: RequestHandler }[] } }[];
  const route = layers.find((layer) => layer.route?.path === '/' && layer.route.methods.post)!.route!;
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  await route.stack.at(-1)!.handle({ body, user: { id: 'customer', role: 'customer' } } as AuthedRequest,
    response as unknown as Response, next as NextFunction);
  return { response, next };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.address.mockResolvedValue('address');
  mocks.rpc.mockResolvedValue({ data: { id: 'order-123', total: 105 }, error: null });
});
it('persists one-shop variant prices with the quote’s exact fees, coupon and total', async () => {
  const items = [line('shop', 'small'), line('shop', 'large')];
  mocks.confirm.mockResolvedValue({ items, bill: calculateCheckoutBill(items, settings, 10), promoCodeId: 'promo' });
  const { next, response } = await place(ordersRouter, { store_id: 'shop', address_id: 'address', items, quote_token: 'signed', payment_method: 'online' });
  expect(next).not.toHaveBeenCalled(); expect(response.status).toHaveBeenCalledWith(201);
  expect(mocks.rpc).toHaveBeenCalledWith('create_order', expect.objectContaining({ p_items: items, p_item_total: 80,
    p_delivery_fee: 20, p_handling_fee: 5, p_discount_amount: 10, p_total: 95, p_commission_amount: 8, p_payment_method: 'online' }));
});
it('persists the multi-shop surcharge once for the entire trip', async () => {
  const items = [line('shop-a', 'small'), line('shop-b', 'large')];
  mocks.confirm.mockResolvedValue({ items, bill: calculateCheckoutBill(items, settings, 0), promoCodeId: null });
  const { next } = await place(tripsRouter, { address_id: 'address', items, quote_token: 'signed', payment_method: 'cod' });
  expect(next).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith('create_trip_orders', expect.objectContaining({ p_item_total: 80,
    p_delivery_fee: 35, p_handling_fee: 5, p_total: 120, p_payment_method: 'cod',
    p_legs: [expect.objectContaining({ store_id: 'shop-a', item_total: 40, commission_amount: 4 }), expect.objectContaining({ store_id: 'shop-b', item_total: 40, commission_amount: 2 })] }));
});
it('uses the store’s own commission rate for a single-shop order', async () => {
  const items = [line('shop-b', 'small')];
  mocks.confirm.mockResolvedValue({ items, bill: calculateCheckoutBill(items, settings, 0), promoCodeId: null });
  await place(ordersRouter, { store_id: 'shop-b', address_id: 'address', items, quote_token: 'signed' });
  expect(mocks.rpc).toHaveBeenCalledWith('create_order', expect.objectContaining({ p_item_total: 40, p_commission_amount: 2 }));
});
it('creates no order or address for a stale quote in either route', async () => {
  mocks.confirm.mockRejectedValue(new AppError(409, 'QUOTE_CHANGED', 'Review your bill'));
  for (const router of [ordersRouter, tripsRouter]) {
    const { next } = await place(router, { store_id: 'shop', address_id: 'address', items: [line('shop', 'pack')], quote_token: 'stale' });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'QUOTE_CHANGED', status: 409 }));
  }
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.address).not.toHaveBeenCalled();
});
it('rejects tip amounts before checkout in either route', async () => {
  for (const router of [ordersRouter, tripsRouter]) {
    const { next } = await place(router, { store_id: 'shop', address_id: 'address', items: [line('shop', 'pack')], quote_token: 'signed', tip_amount: 20 });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'TIPS_UNAVAILABLE' }));
  }
  expect(mocks.confirm).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
});
