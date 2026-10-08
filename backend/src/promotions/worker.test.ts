import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ claim: vi.fn(), account: vi.fn(), update: vi.fn(), deliver: vi.fn(), filters: [] as unknown[][], switchOn: vi.fn() }));
vi.mock('../lib/platformSettings.js', () => ({ promotionsSwitchOn: mocks.switchOn }));
vi.mock('../db/supabase.js', () => ({ supabase: { rpc: mocks.claim, auth: { admin: { getUserById: mocks.account } }, from: () => ({ update: mocks.update }) } }));
vi.mock('./providers.js', async importOriginal => ({ ...await importOriginal<typeof import('./providers.js')>(), providerReady: () => true, deliverPromotion: mocks.deliver }));
import { runPromotions } from './worker.js';
import { DeliveryError } from './providers.js';
const job = { id: 'job', customer_id: 'customer', channel: 'sms', subject: 'Offer', body: 'Savings', lease_token: 'lease', lease_until: new Date(Date.now() + 120000).toISOString(), attempts: 1 };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('PROMOTIONS_ENABLED', 'true'); mocks.filters = []; mocks.switchOn.mockResolvedValue(true);
  mocks.claim.mockResolvedValue({ data: [job], error: null });
  const chain = { eq: (...args: unknown[]) => { mocks.filters.push(args); return chain; }, then: (resolve: (v: unknown) => void) => resolve({ error: null }) };
  mocks.update.mockReturnValue(chain);
  mocks.account.mockResolvedValue({ data: { user: { phone: '919999999999', phone_confirmed_at: 'today', user_metadata: {} } }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it('honours a saved opt-out immediately before delivery', async () => {
  mocks.account.mockResolvedValue({ data: { user: { phone: '919999999999', phone_confirmed_at: 'today', user_metadata: { customer_promotional_preferences: { sms: false } } } }, error: null });
  await runPromotions(); expect(mocks.deliver).not.toHaveBeenCalled();
  expect(mocks.update.mock.calls[0][0].status).toBe('skipped');
});
it('only completes the claimed lease and stores provider acceptance separately from delivery', async () => {
  mocks.deliver.mockResolvedValue('provider'); await runPromotions();
  expect(mocks.update.mock.calls[0][0]).toMatchObject({ status: 'accepted', provider_id: 'provider' });
  expect(mocks.filters).toContainEqual(['lease_token', 'lease']);
});
it('keeps an ambiguous SMS in reconciliation state', async () => {
  mocks.deliver.mockRejectedValue(new DeliveryError('uncertain', 'timeout')); await runPromotions();
  expect(mocks.update.mock.calls[0][0].status).toBe('uncertain');
});
it('does not call the database while campaigns are disabled', async () => {
  vi.stubEnv('PROMOTIONS_ENABLED', 'false'); await runPromotions(); expect(mocks.claim).not.toHaveBeenCalled();
});
it('does not claim or send while the admin kill switch is off, even with the env var on', async () => {
  mocks.switchOn.mockResolvedValue(false);
  expect(await runPromotions()).toEqual({ more: false });
  expect(mocks.claim).not.toHaveBeenCalled(); expect(mocks.deliver).not.toHaveBeenCalled();
});
