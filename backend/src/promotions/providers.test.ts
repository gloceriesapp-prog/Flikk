import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deliverPromotion, providerReady } from './providers.js';
const message = { id: 'job-1', channel: 'email' as const, destination: 'test@example.com', subject: 'Offers', body: 'Savings' };
beforeEach(() => {
  vi.stubEnv('PROMOTIONS_ENABLED', 'true'); vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('PROMOTIONAL_EMAIL_FROM', 'test@example.com');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('never sends while disabled', async () => {
  vi.stubEnv('PROMOTIONS_ENABLED', 'false'); const send = vi.fn(); vi.stubGlobal('fetch', send);
  expect(providerReady('email')).toBe(false);
  await expect(deliverPromotion(message)).rejects.toMatchObject({ outcome: 'failed' });
  expect(send).not.toHaveBeenCalled();
});
it('uses a stable email idempotency key for retries', async () => {
  const send = vi.fn(async () => Response.json({ id: 'provider-1' })); vi.stubGlobal('fetch', send);
  expect(await deliverPromotion(message)).toBe('provider-1');
  expect(send.mock.calls[0][1].headers['Idempotency-Key']).toBe('promotion/job-1');
});
it('preserves uncertain email outcomes so workers cannot blindly resend', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));
  await expect(deliverPromotion(message)).rejects.toMatchObject({ outcome: 'uncertain' });
});
it('never sends promotional SMS: DLT needs approved templates, not free text', async () => {
  const send = vi.fn(); vi.stubGlobal('fetch', send);
  expect(providerReady('sms')).toBe(false);
  await expect(deliverPromotion({ ...message, channel: 'sms', destination: '+919999999999' })).rejects.toMatchObject({ outcome: 'failed' });
  expect(send).not.toHaveBeenCalled();
});
it('does not treat rejected or malformed provider replies as acceptance', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'bad' }, { status: 400 })));
  await expect(deliverPromotion(message)).rejects.toMatchObject({ outcome: 'failed' });
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({})));
  await expect(deliverPromotion(message)).rejects.toMatchObject({ outcome: 'uncertain' });
});
