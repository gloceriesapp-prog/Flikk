// Server-only Cashfree PG REST adapter (no SDK). The app only ever receives
// an order id + payment_session_id; the secret never leaves this process.
// Field names: https://www.cashfree.com/docs/api-reference/payments/latest
import crypto from 'node:crypto';
import { cashfreeConfigured, env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const CASHFREE_API_VERSION = '2025-01-01';
const host = () => (env.cashfreeEnv === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

// providerStatus 0 = network/timeout (outcome unknown). The message is always
// our own generic text, never Cashfree's.
export class CashfreeError extends AppError {
  constructor(readonly providerStatus: number, readonly providerCode?: string) {
    super(502, 'PAYMENT_PROVIDER_ERROR', 'Payment confirmation is unavailable. Please retry shortly.');
    this.name = 'CashfreeError';
  }
}
const code = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_]{1,80}$/.test(value) ? value : undefined);

// Cashfree speaks rupees (up to 2 decimals); we compute in paise.
export function rupeesFromPaise(paise: number): number {
  if (!Number.isSafeInteger(paise) || paise <= 0) throw new Error('Invalid paise amount');
  return paise / 100;
}
export function paiseFromRupees(rupees: unknown): number {
  const value = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid rupee amount');
  return Math.round(value * 100);
}
// Same deterministic id as Razorpay's receipt (gl_ + 32 hex): a duplicate
// create is refused by Cashfree (409) and a lost response recovers by GET.
export const CASHFREE_ORDER_ID = /^gl_[0-9a-f]{32}$/;
export const CASHFREE_PAYMENT_ID = /^[0-9]{1,30}$/;
// refund_id: 3-40 chars, alphanumeric.
export function cashfreeRefundId(requestKey: string): string {
  const id = requestKey.replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
  if (id.length < 3) throw new Error('Invalid refund key');
  return id;
}

export interface CfOrder {
  order_id: string; order_amount: number; order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED' | string;
  payment_session_id?: string; order_tags?: Record<string, string> | null;
}
export interface CfPayment {
  cf_payment_id: string | number; order_id: string;
  payment_status: 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'VOID' | 'CANCELLED' | 'PENDING' | string;
  payment_amount: number; payment_currency: string; payment_group?: string; is_captured?: boolean;
}
export interface CfRefund {
  cf_refund_id?: string | number; cf_payment_id?: string | number; refund_id: string; order_id?: string;
  refund_amount: number; refund_status: 'SUCCESS' | 'PENDING' | 'PENDING_APPROVAL' | 'CANCELLED' | 'ONHOLD' | 'REJECTED' | string;
}

async function call<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  if (!cashfreeConfigured) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payment is unavailable. Choose cash on delivery.');
  let response: globalThis.Response;
  try {
    response = await fetch(`${host()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        'x-client-id': env.cashfreeAppId!, 'x-client-secret': env.cashfreeSecretKey!,
        'x-api-version': CASHFREE_API_VERSION, 'x-request-id': crypto.randomUUID(),
        ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new CashfreeError(0); }
  const data = await response.json().catch(() => null) as (T & { code?: unknown }) | null;
  if (!response.ok) throw new CashfreeError(response.status, code(data?.code));
  if (data === null) throw new CashfreeError(response.status, 'invalid_response');
  return data;
}

export function createCfOrder(input: { orderId: string; amountPaise: number; customerId: string; phone: string;
  email?: string; tags: Record<string, string>; expiresAt?: Date }): Promise<CfOrder> {
  if (!CASHFREE_ORDER_ID.test(input.orderId)) throw new Error('Invalid Cashfree order id');
  return call<CfOrder>('POST', '/orders', {
    order_id: input.orderId, order_amount: rupeesFromPaise(input.amountPaise), order_currency: 'INR',
    // customer_id: alphanumeric 3-50; customer_phone: 10 digits.
    customer_details: { customer_id: input.customerId.replace(/[^A-Za-z0-9]/g, ''), customer_phone: input.phone,
      ...(input.email ? { customer_email: input.email } : {}) },
    order_tags: input.tags,
    ...(input.expiresAt ? { order_expiry_time: input.expiresAt.toISOString() } : {}),
    ...(env.publicApiUrl ? { order_meta: { notify_url: `${env.publicApiUrl}/payments/cashfree/webhook` } } : {}),
  }, crypto.createHash('sha256').update(input.orderId).digest('hex'));
}
// null = Cashfree has no such order (404).
export async function getCfOrder(orderId: string): Promise<CfOrder | null> {
  if (!CASHFREE_ORDER_ID.test(orderId)) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This payment needs support review.');
  try { return await call<CfOrder>('GET', `/orders/${orderId}`); }
  catch (error) { if (error instanceof CashfreeError && error.providerStatus === 404) return null; throw error; }
}
export async function getCfOrderPayments(orderId: string): Promise<CfPayment[]> {
  const items = await call<CfPayment[]>('GET', `/orders/${orderId}/payments`);
  if (!Array.isArray(items)) throw new CashfreeError(200, 'invalid_response');
  return items;
}
export async function getCfRefunds(orderId: string): Promise<CfRefund[]> {
  const items = await call<CfRefund[]>('GET', `/orders/${orderId}/refunds`);
  if (!Array.isArray(items)) throw new CashfreeError(200, 'invalid_response');
  return items;
}
export function createCfRefund(orderId: string, input: { refundId: string; amountPaise: number; note: string }): Promise<CfRefund> {
  return call<CfRefund>('POST', `/orders/${orderId}/refunds`, {
    refund_amount: rupeesFromPaise(input.amountPaise), refund_id: input.refundId, refund_note: input.note.slice(0, 100), refund_speed: 'STANDARD',
  }, crypto.createHash('sha256').update(`refund:${input.refundId}`).digest('hex'));
}

// base64(HMAC-SHA256(timestamp + rawBody, API secret)). Timestamps older than
// 5 minutes are replays; duplicates inside the window are harmless because
// settlement is idempotent.
export const WEBHOOK_MAX_AGE_MS = 5 * 60_000;
export function verifyCashfreeWebhook(rawBody: string, timestamp: string, signature: string, now = Date.now(), secret = env.cashfreeSecretKey): boolean {
  if (!secret || !/^\d{10,13}$/.test(timestamp) || !signature) return false;
  const ms = timestamp.length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (Math.abs(now - ms) > WEBHOOK_MAX_AGE_MS) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64'));
  const given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
