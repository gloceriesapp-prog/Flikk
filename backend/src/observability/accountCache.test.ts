import { expect, it } from 'vitest';
import { accountQueryClient, resetAccountData } from '../../../apps/customer/src/features/account-session/accountCache';
it('replaces private cache on account change and isolates late responses', async () => {
  resetAccountData(); const previous = accountQueryClient();
  previous.setQueryData(['orders', 'customer-a'], ['private-order']);
  let resolve!: (value: unknown) => void;
  const pending = previous.fetchQuery({ queryKey: ['profile', 'customer-a'], queryFn: () => new Promise(done => { resolve = done; }) }).catch(() => undefined);
  resetAccountData(); const next = accountQueryClient();
  expect(next).not.toBe(previous); expect(next.getQueryData(['orders', 'customer-a'])).toBeUndefined();
  resolve({ phone: 'private' }); await pending;
  expect(next.getQueryData(['profile', 'customer-a'])).toBeUndefined();
});
