import { afterEach, expect, it, vi } from 'vitest';
import { releasePayoutRequest, type PayoutRequest } from './releasePayout.js';
afterEach(() => vi.unstubAllGlobals());
it('retries the identical frozen payout with the provider idempotency header', async () => {
  const fetch=vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce({ok:true,json:async()=>({id:'pout_1',status:'processing'})});
  vi.stubGlobal('fetch',fetch);
  const request: PayoutRequest={account_number:'account',fund_account_id:'fund',amount:1200,currency:'INR',mode:'UPI',purpose:'payout',queue_if_low_balance:true,reference_id:'payout',narration:'settlement'};
  await expect(releasePayoutRequest(request,'same-key')).rejects.toThrow('Lost response');
  await expect(releasePayoutRequest(request,'same-key')).resolves.toMatchObject({razorpayPayoutId:'pout_1'});
  for(const [, options] of fetch.mock.calls) {
    expect(options.headers['X-Payout-Idempotency']).toBe('same-key');
    expect(options.body).toBe(JSON.stringify(request));
    expect(options.signal).toBeInstanceOf(AbortSignal);
  }
});
