import { RazorpayError } from './razorpayClient.js';
import { getRazorpayMethods } from './razorpayMethods.js';

export interface NetbankingBank { code: string; name: string }

export function parseNetbankingBanks(value: unknown): NetbankingBank[] {
  const methods = value as { netbanking?: unknown } | null;
  if (!methods || !methods.netbanking || typeof methods.netbanking !== 'object' || Array.isArray(methods.netbanking))
    throw new RazorpayError(200, 'invalid_methods');
  return Object.entries(methods.netbanking)
    .filter(([code, name]) => /^[A-Z0-9_]{2,20}$/.test(code) && typeof name === 'string' && name.trim().length > 0 && name.length <= 150)
    .map(([code, name]) => ({ code, name: (name as string).trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));
}

export async function getNetbankingBanks(): Promise<NetbankingBank[]> {
  return parseNetbankingBanks(await getRazorpayMethods());
}
