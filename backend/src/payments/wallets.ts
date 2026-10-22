import { RazorpayError } from './razorpayClient.js';
import { getRazorpayMethods } from './razorpayMethods.js';

const SUPPORTED_WALLETS = [
  { code: 'mobikwik', name: 'MobiKwik' },
  { code: 'olamoney', name: 'Ola Money' },
] as const;

export function parseAvailableWallets(methods: Record<string, unknown>) {
  if (methods.wallet == null || methods.wallet === false) return [];
  if (typeof methods.wallet !== 'object' || Array.isArray(methods.wallet)) throw new RazorpayError(200, 'invalid_wallet_methods');
  const wallet = methods.wallet as Record<string, unknown>;
  return SUPPORTED_WALLETS.filter(option => wallet[option.code] === true);
}
export async function getAvailableWallets() { return parseAvailableWallets(await getRazorpayMethods()); }
