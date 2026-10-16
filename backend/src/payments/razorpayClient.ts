// Server-only Razorpay REST adapter. Native Checkout receives the public key only.
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env, paymentsConfigured } from '../config/env.js';
import { AppError } from '../lib/errors.js';
export { paymentsConfigured };
export function paymentsNotConfigured() { return new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payment is unavailable. Choose cash on delivery.'); }
export function requirePaymentsConfigured(_req: Request, _res: Response, next: NextFunction) { next(paymentsConfigured ? undefined : paymentsNotConfigured()); }
export class RazorpayError extends AppError {
  constructor(readonly providerStatus: number, readonly providerCode?: string) {
    super(502, 'PAYMENT_PROVIDER_ERROR', 'Payment confirmation is unavailable. Please retry shortly.'); this.name = 'RazorpayError';
  }
}
export function toPaise(rupees: unknown): number {
  const value = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) throw new Error('Invalid rupee amount');
  return Math.round(value * 100);
}
export function checkoutReceipt(targetId: string) { return `gl_${targetId.replace(/-/g, '')}`; }
export function refundRequestKey(key: string) { return `gl_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`; }
export interface RazorpayOrder { id: string; amount: number; currency: string; receipt: string; status: string; notes?: Record<string, string>; }
export interface RazorpayPayment { id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean; }
export interface RazorpayUpiIntent { razorpay_payment_id: string; link: string; }
export interface RazorpayRefund { id: string; payment_id: string; amount: number; status: string; receipt?: string; notes?: Record<string, string>; }
async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown, headers?: Record<string,string>): Promise<T> {
  if (!paymentsConfigured) throw paymentsNotConfigured();
  let response: globalThis.Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method, headers: { Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
  } catch { throw new RazorpayError(0); }
  const data = await response.json().catch(() => null) as T & { error?: { code?: string } } | null;
  if (!response.ok || data === null) throw new RazorpayError(response.status, data?.error?.code);
  return data;
}
export function createProviderOrder(input: {receipt: string; amountPaise: number; notes: Record<string,string>}) {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) throw new Error('Invalid payment amount');
  return call<RazorpayOrder>('POST', '/orders', { amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes, partial_payment: false });
}
export async function getProviderOrder(id: string): Promise<RazorpayOrder | null> {
  if (!/^order_[A-Za-z0-9]+$/.test(id)) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This payment needs support review.');
  try { return await call<RazorpayOrder>('GET', `/orders/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof RazorpayError && error.providerStatus === 404) return null; throw error; }
}
export async function findProviderOrder(receipt: string): Promise<RazorpayOrder | null> {
  const result = await call<{items:RazorpayOrder[]}>('GET', `/orders?receipt=${encodeURIComponent(receipt)}&count=100`);
  if (!Array.isArray(result.items)) throw new RazorpayError(200, 'invalid_response');
  const matches = result.items.filter(order => order.receipt === receipt);
  if (matches.length > 1) throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Multiple payment orders need support review.');
  return matches[0] ?? null;
}
export async function getOrderPayments(id: string): Promise<RazorpayPayment[]> {
  const result = await call<{items:RazorpayPayment[]}>('GET', `/orders/${encodeURIComponent(id)}/payments`);
  if (!Array.isArray(result.items)) throw new RazorpayError(200, 'invalid_response');
  return result.items;
}
export function getProviderPayment(id: string) { return call<RazorpayPayment>('GET', `/payments/${encodeURIComponent(id)}`); }
// Razorpay test instructions use simulated VPAs. Real UPI apps cannot pay
// those addresses; never send a test-mode instruction to an installed app.
export function requireLiveUpiIntent(mode: string = env.razorpayEnv): void {
  if (mode !== 'live') throw new AppError(409, 'UPI_INTENT_REQUIRES_LIVE_MODE',
    'UPI app payments require live Razorpay keys. Test-mode payments must use the Razorpay test checkout simulator.');
}
export function createProviderUpiIntent(input: {
  providerOrderId: string; amountPaise: number; email: string; contact: string;
  notes: Record<string, string>; ip?: string; userAgent?: string;
}) {
  requireLiveUpiIntent();
  if (!/^order_[A-Za-z0-9]+$/.test(input.providerOrderId) || !Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0)
    throw new Error('Invalid UPI payment target');
  return call<RazorpayUpiIntent>('POST', '/payments/create/upi', {
    amount: input.amountPaise, currency: 'INR', order_id: input.providerOrderId,
    email: input.email, contact: input.contact, method: 'upi', upi: { flow: 'intent' },
    description: 'Gloceries order', notes: input.notes,
    ...(input.ip ? { ip: input.ip } : {}), ...(input.userAgent ? { user_agent: input.userAgent } : {}),
  });
}
export async function getPaymentRefunds(id: string): Promise<RazorpayRefund[]> {
  // An order can have many partial refunds. Read every bounded page before computing remaining money.
  const items: RazorpayRefund[] = [];
  for (let skip = 0; skip < 1000; skip += 100) {
    const page = await call<{items:RazorpayRefund[]}>('GET', `/payments/${encodeURIComponent(id)}/refunds?count=100&skip=${skip}`);
    if (!Array.isArray(page.items)) throw new RazorpayError(200, 'invalid_response');
    items.push(...page.items); if (page.items.length < 100) return items;
  }
  throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'Refund history needs support review.');
}
export function createProviderRefund(paymentId: string, input: {requestKey:string;amountPaise:number;note:string}) {
  return call<RazorpayRefund>('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, {
    amount: input.amountPaise, speed: 'normal', receipt: input.requestKey, notes: { gloceries_refund_key: input.requestKey, reason: input.note },
  }, { 'X-Refund-Idempotency': input.requestKey });
}
function validHmac(message: string, signature: string, secret: string | undefined) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(message).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = env.razorpayKeySecret) {
  return validHmac(`${orderId}|${paymentId}`, signature, secret);
}
export function verifyWebhookSignature(rawBody: string, signature: string, secret = env.razorpayWebhookSecret) {
  // Razorpay does not sign a timestamp. Duplicate/delayed authentic events are safe via transactional settlement.
  return validHmac(rawBody, signature, secret);
}
