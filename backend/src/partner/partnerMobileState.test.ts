import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), secure: { getItemAsync: vi.fn(), setItemAsync: vi.fn().mockResolvedValue(undefined), deleteItemAsync: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('expo-secure-store', () => mocks.secure);
vi.mock('../../../apps/partner/src/api/client', () => ({ apiRequest: mocks.request, ApiError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
import { useOrderReminderStore } from '../../../apps/partner/src/features/order-expiry/useOrderReminderStore';
import { useDeliveryEarnedAlertStore } from '../../../apps/partner/src/features/delivery-earned-alert/useDeliveryEarnedAlertStore';
import { useAuthStore } from '../../../apps/partner/src/store/useAuthStore';
import { useStoreProfileStore } from '../../../apps/partner/src/store/useStoreProfileStore';
import { useCatalogStore } from '../../../apps/partner/src/store/useCatalogStore';
import { getSessionEpoch, isCurrentSession, onSessionReset, resetSessionScope } from '../../../apps/partner/src/store/sessionScope';
import { parseMoneyInput, isMoneyInput, validVariantPrices } from '../../../apps/partner/src/utils/moneyInput';
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const row = (open: boolean) => ({ id: 'store-a', name: 'Shop A', category: 'Grocery', is_active: open });
beforeEach(async () => { mocks.request.mockReset(); await useAuthStore.getState().clear(); });
describe('partner rupee input', () => {
 it('preserves paise without multiplying prices', () => {
  expect(parseMoneyInput('14.50')).toBe(14.5); expect(parseMoneyInput('0.05')).toBe(0.05); expect(parseMoneyInput('14.')).toBe(14); expect(isMoneyInput('14.')).toBe(true);
  for (const raw of ['1,450', '14.500', '-14.50', '1e3']) expect(parseMoneyInput(raw)).toBeNull();
 });
 it('rejects invalid prices and MRP below selling price', () => {
  expect(validVariantPrices([{ price: 14.5, originalPrice: 15.25 }])).toBe(true);
  for (const price of [0, -1, Infinity, NaN]) expect(validVariantPrices([{ price }])).toBe(false);
  expect(validVariantPrices([{ price: 14.5, originalPrice: 14.49 }])).toBe(false);
 });
});
describe('partner account boundary', () => {
 it('keeps the onboarding session identity through token rotation but changes it for a new login', async () => {
  await useAuthStore.getState().setSession('first-token', 'first-refresh', false, false, false);
  const identity = useAuthStore.getState().sessionEpoch;
  const reset = vi.fn(); const stop = onSessionReset(reset);
  await useAuthStore.getState().setTokens('rotated-token', 'rotated-refresh', identity);
  expect(useAuthStore.getState().sessionEpoch).toBe(identity);
  expect(useAuthStore.getState().accessToken).toBe('rotated-token');
  expect(reset).not.toHaveBeenCalled();
  await useAuthStore.getState().setSession('other-account', 'other-refresh', false, false, false);
  expect(useAuthStore.getState().sessionEpoch).not.toBe(identity);
  expect(reset).toHaveBeenCalledOnce(); stop();
 });
 it('invalidates captured generations and notifies reset subscribers', () => {
  const old = getSessionEpoch(); const callback = vi.fn(); const stop = onSessionReset(callback); resetSessionScope(); stop();
  expect(isCurrentSession(old)).toBe(false); expect(callback).toHaveBeenCalledOnce();
 });
 it('clears private stores synchronously and rejects stale refresh tokens', async () => {
  await useAuthStore.getState().setSession('account-a', 'refresh-a', true, true, false); const old = getSessionEpoch();
  useOrderReminderStore.getState().showReminder({ orderId: 'a', customerName: 'Private A', stage: 'first' });
  useDeliveryEarnedAlertStore.getState().showEarning({ orderId: 'a', orderNumber: 'A', netEarned: 10 });
  useStoreProfileStore.setState({ profile: { ...useStoreProfileStore.getState().profile, id: 'store-a', storeName: 'Private A' } }); useCatalogStore.setState({ loaded: true });
  const clearing = useAuthStore.getState().clear(); expect(useAuthStore.getState().accessToken).toBeNull(); expect(useStoreProfileStore.getState().profile.id).toBe(''); expect(useCatalogStore.getState().loaded).toBe(false); expect(useOrderReminderStore.getState().activeReminder).toBeNull(); expect(useDeliveryEarnedAlertStore.getState().activeEarning).toBeNull(); await clearing;
  await useAuthStore.getState().setSession('account-b', 'refresh-b', true, true, false); await useAuthStore.getState().setTokens('late-a', 'late-refresh-a', old); expect(useAuthStore.getState().accessToken).toBe('account-b');
 });
 it('discards profile reads that resolve after account changes', async () => {
  const late = deferred<ReturnType<typeof row>>(); mocks.request.mockReturnValueOnce(late.promise); const loading = useStoreProfileStore.getState().loadProfile(); resetSessionScope(); late.resolve(row(true)); await loading; expect(useStoreProfileStore.getState().profile.id).toBe('');
 });
});
describe('store availability writes', () => {
 it('saves a temporary override and resumes automatic hours through the authoritative endpoint', async () => {
  mocks.request.mockResolvedValueOnce(row(false)); await useStoreProfileStore.getState().loadProfile();
  mocks.request.mockResolvedValueOnce({ ...row(true), availability_override: true, availability_override_until: '2026-10-17T03:30:00Z' });
  await useStoreProfileStore.getState().toggleOpen();
  expect(mocks.request).toHaveBeenLastCalledWith('/partner/store/availability', { method: 'PATCH', body: { mode: 'open' } });
  expect(useStoreProfileStore.getState().profile.availabilityOverride).toBe(true);
  mocks.request.mockResolvedValueOnce({ ...row(false), availability_override: null, availability_override_until: null });
  await useStoreProfileStore.getState().setAvailability('auto');
  expect(mocks.request).toHaveBeenLastCalledWith('/partner/store/availability', { method: 'PATCH', body: { mode: 'auto' } });
  expect(useStoreProfileStore.getState().profile.availabilityOverride).toBeNull();
 });
 it('serializes legacy profile hours as 24-hour times before sending the PATCH', async () => {
  mocks.request.mockResolvedValue(row(true)); await useStoreProfileStore.getState().loadProfile(); mocks.request.mockClear();
  const result = await useStoreProfileStore.getState().updateProfile({ openTime: '9:00 AM', closeTime: '9:00 PM' });
  expect(result.ok).toBe(true);
  expect(mocks.request).toHaveBeenCalledWith('/partner/store', expect.objectContaining({ body: expect.objectContaining({ open_time: '09:00', close_time: '21:00' }) }));
 });
 it('blocks invalid hours before sending a request or changing the profile', async () => {
  mocks.request.mockResolvedValue(row(true)); await useStoreProfileStore.getState().loadProfile(); mocks.request.mockClear();
  const before = useStoreProfileStore.getState().profile;
  const result = await useStoreProfileStore.getState().updateProfile({ openTime: '13:60 PM' });
  expect(result.ok).toBe(false); expect(mocks.request).not.toHaveBeenCalled();
  expect(useStoreProfileStore.getState().profile).toBe(before);
 });
 it('prevents double toggle, rolls back failure and exposes an error', async () => {
  mocks.request.mockResolvedValueOnce(row(false)); await useStoreProfileStore.getState().loadProfile();
  const saving = deferred<never>(); mocks.request.mockReturnValueOnce(saving.promise); const first = useStoreProfileStore.getState().toggleOpen(); await Promise.resolve(); await Promise.resolve();
  await useStoreProfileStore.getState().toggleOpen(); expect(mocks.request).toHaveBeenCalledTimes(2); saving.reject(new Error('offline')); mocks.request.mockResolvedValueOnce(row(false)); await first;
  expect(useStoreProfileStore.getState().profile.isOpen).toBe(false); expect(useStoreProfileStore.getState().togglingOpen).toBe(false); expect(useStoreProfileStore.getState().statusError).toContain('Could not save');
 });
 it('uses server state and ignores stale reads during a save', async () => {
  mocks.request.mockResolvedValueOnce(row(false)); await useStoreProfileStore.getState().loadProfile(); const stale = deferred<ReturnType<typeof row>>(); mocks.request.mockReturnValueOnce(stale.promise); const loading = useStoreProfileStore.getState().loadProfile(); mocks.request.mockResolvedValueOnce(row(true)); await useStoreProfileStore.getState().toggleOpen(); stale.resolve(row(false)); await loading; expect(useStoreProfileStore.getState().profile.isOpen).toBe(true);
 });
});
