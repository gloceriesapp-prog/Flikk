import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../config/env.js', () => ({ env: { razorpayKeyId: 'rzp_test_banks', razorpayKeySecret: 'never-send-this' }, paymentsConfigured: true }));
import { getNetbankingBanks, parseNetbankingBanks } from './netbankingBanks.js';
afterEach(() => vi.unstubAllGlobals());
it('only accepts provider bank entries, orders names and rejects malformed methods', () => {
  expect(parseNetbankingBanks({ netbanking: { SBIN: 'State Bank of India', HDFC: 'HDFC Bank', BAD: false, 'bad code': 'Fake', BLANK: '' } }))
    .toEqual([{ code: 'HDFC', name: 'HDFC Bank' }, { code: 'SBIN', name: 'State Bank of India' }]);
  expect(() => parseNetbankingBanks({})).toThrow();
  expect(parseNetbankingBanks({ netbanking: {} })).toEqual([]);
});
it('retries a provider failure, uses only the key ID and deduplicates successful requests', async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => ({ netbanking: { HDFC: 'HDFC Bank' } }) });
  vi.stubGlobal('fetch', fetch);
  await expect(getNetbankingBanks()).rejects.toThrow();
  const [a, b] = await Promise.all([getNetbankingBanks(), getNetbankingBanks()]);
  expect(a).toEqual([{ code: 'HDFC', name: 'HDFC Bank' }]); expect(b).toEqual(a);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toBe('https://api.razorpay.com/v1/methods');
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe(`Basic ${Buffer.from('rzp_test_banks:').toString('base64')}`);
});
