// Minimal typed Cashfree PG client (no SDK). Secrets never leave this
// process; the customer app only receives an order id + payment_session_id.
// Field names follow https://www.cashfree.com/docs/api-reference/payments/latest
// (x-api-version pinned below; webhook payload version is set per endpoint in
// the Cashfree dashboard and must match).
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env, paymentsConfigured } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export { paymentsConfigured };
export const CASHFREE_API_VERSION = '2025-01-01';
const VERIFICATION_API_VERSION = '2024-12-01';
const TIMEOUT_MS = 15_000;
const host = () => (env.cashfreeEnv === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com');

export function paymentsNotConfigured(): AppError {
  return new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payment is not available yet. Choose Cash on Delivery.');
}
// Route guard: 503 before any provider call or DB claim is made.
export function requirePaymentsConfigured(_req: Request, _res: Response, next: NextFunction) {
  next(paymentsConfigured ? undefined : paymentsNotConfigured());
}

// Provider failure. `providerStatus` 0 = network/timeout (outcome unknown).
// Callers decide definitive vs retryable from it; the HTTP status/message is
// always our own generic 502, never Cashfree's text.
export class CashfreeError extends AppError {
  constructor(readonly providerStatus: number, readonly providerCode?: string) {
    super(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not complete this request. Please retry.');
    this.name = 'CashfreeError';
  }
}

// --- Money: Cashfree speaks rupees with 2 decimals; we compute in paise. ---
export function toRupees(paise: number): number {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error('Invalid paise amount');
  return paise / 100;
}
export function toPaise(rupees: unknown): number {
  const value = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid rupee amount');
  return Math.round(value * 100);
}

// Deterministic per checkout target: a lost create response is recovered by
// GET on the same id (and a duplicate create is refused by Cashfree).
export function cashfreeOrderId(targetId: string): string {
  return `gl_${targetId.replace(/-/g, '')}`;
}
// Deterministic refund_id (3-40 chars) per refund job/request key.
export function cashfreeRefundId(key: string): string {
  const id = `rf_${key.replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 40);
  if (id.length < 6) throw new Error('Invalid refund key');
  return id;
}

export interface CfOrder {
  cf_order_id?: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED' | string;
  payment_session_id?: string;
  order_tags?: Record<string, string> | null;
  order_expiry_time?: string;
}
export type CfPaymentStatus = 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'VOID' | 'CANCELLED' | 'PENDING';
export interface CfPayment {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: CfPaymentStatus | string;
  payment_amount: number;
  payment_currency: string;
  payment_group?: string;
  is_captured?: boolean;
}
export interface CfRefund {
  cf_refund_id?: string | number;
  cf_payment_id?: string | number;
  refund_id: string;
  order_id?: string;
  refund_amount: number;
  refund_status: 'SUCCESS' | 'PENDING' | 'PENDING_APPROVAL' | 'CANCELLED' | 'ONHOLD' | 'REJECTED' | string;
}
// Cashfree's link payload keys (data.payload): default, gpay, phonepe, paytm,
// bhim (+ web, and possibly others). Every string key is passed through.
export type UpiLinks = { default: string } & Record<string, string>;
export interface CfPayResponse {
  cf_payment_id: string | number;
  payment_method: string;
  channel: string;
  action: string;
  payment_amount: number;
  data?: { url?: string | null; payload?: Record<string, string> | null; vpa?: string; expiry?: string } | null;
}

interface CallOptions {
  body?: unknown;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  base?: string;
  auth?: { id: string; secret: string };
  apiVersion?: string;
}
async function call<T>(method: 'GET' | 'POST' | 'PATCH', path: string, options: CallOptions = {}): Promise<T> {
  if (!paymentsConfigured && !options.auth) throw paymentsNotConfigured();
  const auth = options.auth ?? { id: env.cashfreeAppId!, secret: env.cashfreeSecretKey! };
  let response: globalThis.Response;
  try {
    response = await fetch(`${options.base ?? `${host()}/pg`}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client-id': auth.id,
        'x-client-secret': auth.secret,
        'x-api-version': options.apiVersion ?? CASHFREE_API_VERSION,
        'x-request-id': crypto.randomUUID(),
        ...(options.idempotencyKey ? { 'x-idempotency-key': options.idempotencyKey } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new CashfreeError(0);
  }
  const data = await response.json().catch(() => null) as T & { code?: string } | null;
  if (!response.ok) throw new CashfreeError(response.status, typeof data?.code === 'string' ? data.code : undefined);
  if (data === null) throw new CashfreeError(response.status, 'invalid_response');
  return data;
}

export async function createCfOrder(input: {
  orderId: string; amountPaise: number; customerId: string; customerPhone: string;
  tags: Record<string, string>; expiresAt: Date;
}): Promise<CfOrder> {
  return call<CfOrder>('POST', '/orders', {
    idempotencyKey: input.orderId,
    body: {
      order_id: input.orderId,
      order_amount: toRupees(input.amountPaise),
      order_currency: 'INR',
      // customer_id: alphanumeric 3-50; customer_phone: 10 digits.
      customer_details: { customer_id: input.customerId.replace(/[^A-Za-z0-9]/g, ''), customer_phone: input.customerPhone },
      order_tags: input.tags,
      order_expiry_time: input.expiresAt.toISOString(),
      ...(env.publicApiUrl ? { order_meta: { notify_url: `${env.publicApiUrl}/payments/webhook` } } : {}),
    },
  });
}
// null = Cashfree has no such order (404).
export async function getCfOrder(orderId: string): Promise<CfOrder | null> {
  try {
    return await call<CfOrder>('GET', `/orders/${encodeURIComponent(orderId)}`);
  } catch (error) {
    if (error instanceof CashfreeError && error.providerStatus === 404) return null;
    throw error;
  }
}
export async function getCfOrderPayments(orderId: string): Promise<CfPayment[]> {
  const items = await call<CfPayment[]>('GET', `/orders/${encodeURIComponent(orderId)}/payments`);
  if (!Array.isArray(items)) throw new CashfreeError(200, 'invalid_response');
  return items;
}
// Best effort: Cashfree may answer TERMINATION_REQUESTED, or refuse when a
// payment already succeeded. Callers re-read payments afterwards and the
// settle-after-cancel refund path covers any late SUCCESS.
export async function terminateCfOrder(orderId: string): Promise<string | null> {
  try {
    const order = await call<CfOrder>('PATCH', `/orders/${encodeURIComponent(orderId)}`, { body: { order_status: 'TERMINATED' } });
    return order.order_status ?? null;
  } catch {
    return null;
  }
}
export async function payCfOrder(input: {
  paymentSessionId: string; upi: { channel: 'link' | 'collect'; upi_id?: string; upi_expiry_minutes?: number };
  idempotencyKey: string; os: 'android' | 'ios' | 'others';
}): Promise<CfPayResponse> {
  return call<CfPayResponse>('POST', '/orders/sessions', {
    idempotencyKey: input.idempotencyKey,
    headers: { 'x-client-device': 'mobile', 'x-client-os': input.os, 'x-client-rendering-type': 'native', 'x-client-browser': 'others' },
    body: { payment_session_id: input.paymentSessionId, payment_method: { upi: input.upi } },
  });
}
export async function getCfRefunds(orderId: string): Promise<CfRefund[]> {
  const items = await call<CfRefund[]>('GET', `/orders/${encodeURIComponent(orderId)}/refunds`);
  if (!Array.isArray(items)) throw new CashfreeError(200, 'invalid_response');
  return items;
}
export async function createCfRefund(orderId: string, input: { refundId: string; amountPaise: number; note: string }): Promise<CfRefund> {
  return call<CfRefund>('POST', `/orders/${encodeURIComponent(orderId)}/refunds`, {
    idempotencyKey: input.refundId,
    body: { refund_amount: toRupees(input.amountPaise), refund_id: input.refundId, refund_note: input.note, refund_speed: 'STANDARD' },
  });
}

export const verificationConfigured = () => Boolean(env.cashfreeVerificationClientId && env.cashfreeVerificationSecret);
// Secure ID UPI lookup (POST /verification/upi/penny-drop). Returns the
// account holder name for a VALID VPA, otherwise valid:false.
export async function verifyCfVpa(vpa: string): Promise<{ valid: boolean; name: string | null }> {
  const result = await call<{ status?: string; name_at_bank?: string | null }>('POST', '/upi/penny-drop', {
    base: `${host()}/verification`,
    apiVersion: VERIFICATION_API_VERSION,
    auth: { id: env.cashfreeVerificationClientId!, secret: env.cashfreeVerificationSecret! },
    body: {
      verification_id: `upi_${crypto.randomUUID().replace(/-/g, '')}`,
      vpa,
      user_consent: { obtained: true, type: 'EXPLICIT', purpose: 'Confirm UPI ID before payment', timestamp: new Date().toISOString() },
    },
  });
  const valid = result.status === 'VALID';
  return { valid, name: valid && typeof result.name_at_bank === 'string' ? result.name_at_bank : null };
}

// Webhook signature: base64(HMAC_SHA256(timestamp + rawBody, secret)).
// Timestamp is epoch milliseconds; anything outside ±5 minutes is a replay.
export const WEBHOOK_MAX_AGE_MS = 5 * 60_000;
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string, now = Date.now(), secret = env.cashfreeWebhookSecret): boolean {
  if (!secret || !/^\d{10,13}$/.test(timestamp)) return false;
  const ms = timestamp.length <= 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (Math.abs(now - ms) > WEBHOOK_MAX_AGE_MS) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64'));
  const given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Per-app deep link for UPI intent, falling back to the generic link.
export function pickUpiLink(links: UpiLinks, app?: string): string {
  return (app && links[app]) || links.default;
}
export function upiLinksFrom(payload: Record<string, unknown> | null | undefined): UpiLinks | null {
  if (!payload || typeof payload.default !== 'string') return null;
  const links: UpiLinks = { default: payload.default };
  for (const [app, link] of Object.entries(payload)) if (typeof link === 'string') links[app] = link;
  return links;
}
