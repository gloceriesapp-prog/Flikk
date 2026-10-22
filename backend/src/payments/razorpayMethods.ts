import { env, paymentsConfigured } from '../config/env.js';
import { paymentsNotConfigured, RazorpayError } from './razorpayClient.js';
let cache: { key: string; expires: number; methods: Record<string, unknown> } | undefined;
let pending: Promise<Record<string, unknown>> | undefined;

// Read-only provider catalogue; never includes the merchant's key secret.
export async function getRazorpayMethods(): Promise<Record<string, unknown>> {
  if (!paymentsConfigured) throw paymentsNotConfigured();
  if (cache && cache.key === env.razorpayKeyId && cache.expires > Date.now()) return cache.methods;
  if (pending) return pending;
  const key = env.razorpayKeyId!;
  pending = (async () => {
    let response: Response;
    try {
      response = await fetch('https://api.razorpay.com/v1/methods', { headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      }, signal: AbortSignal.timeout(10_000) });
    } catch { throw new RazorpayError(0); }
    if (!response.ok) throw new RazorpayError(response.status);
    const methods = await response.json().catch(() => null);
    if (!methods || typeof methods !== 'object' || Array.isArray(methods)) throw new RazorpayError(200, 'invalid_methods');
    cache = { key, methods, expires: Date.now() + 60_000 };
    return methods as Record<string, unknown>;
  })();
  try { return await pending; } finally { pending = undefined; }
}
