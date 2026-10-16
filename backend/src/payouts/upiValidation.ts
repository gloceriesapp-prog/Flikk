// Validation only: never create a payment, contact, fund account or payout.
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { parsePayoutAccountInput } from '../lib/payoutAccount.js';

export interface UpiValidationResult {
  upiId: string;
  valid: boolean;
  registeredName: string | null;
}

const unavailable = () => new AppError(503, 'UPI_VALIDATION_UNAVAILABLE', 'UPI verification is unavailable. Please try again later.');
const pending = new Map<string, Promise<UpiValidationResult>>();

export function parseUpiValidationInput(body: unknown): string {
  const upiId = body && typeof body === 'object' ? (body as Record<string, unknown>).upiId : undefined;
  const parsed = parsePayoutAccountInput({ method: 'upi', upiId }, '');
  if (parsed.method !== 'upi') throw new Error('Unexpected payout method');
  return parsed.upiId.toLowerCase();
}

async function readProvider(upiId: string): Promise<UpiValidationResult> {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) throw unavailable();
  // Test keys can return simulated validation names, never a real bank lookup.
  if (env.razorpayEnv !== 'live') {
    throw new AppError(503, 'UPI_VALIDATION_REQUIRES_LIVE', 'Live Razorpay keys are required to verify a real UPI ID.');
  }
  try {
    const response = await fetch('https://api.razorpay.com/v1/payments/validate/vpa', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vpa: upiId }),
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if ([401, 403, 404].includes(response.status)) {
      throw new AppError(503, 'UPI_VALIDATION_NOT_ENABLED', 'UPI verification is not available for this Razorpay account. Please contact support.');
    }
    if (!response.ok) throw unavailable();
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object') throw unavailable();
    const row = result as Record<string, unknown>;
    if (typeof row.success !== 'boolean' || typeof row.vpa !== 'string' || row.vpa.trim().toLowerCase() !== upiId) throw unavailable();
    const name = typeof row.customer_name === 'string' ? row.customer_name.trim() : '';
    if (name.length > 200 || [...name].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw unavailable();
    return { upiId, valid: row.success, registeredName: row.success && name ? name : null };
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Do not return provider payloads, credentials or beneficiary metadata in errors.
    throw unavailable();
  }
}

export function validatePartnerUpi(userId: string, body: unknown): Promise<UpiValidationResult> {
  const upiId = parseUpiValidationInput(body);
  const key = createHash('sha256').update(`${userId}:${upiId}`).digest('hex');
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 64) throw new AppError(503, 'UPI_VALIDATION_BUSY', 'UPI verification is busy. Please retry shortly.');
  const promise = readProvider(upiId).finally(() => { pending.delete(key); });
  pending.set(key, promise);
  return promise;
}
