import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { auth: { admin: { getUserById: mocks.getUser, updateUserById: mocks.updateUser } } } }));
import { getPromotionalPreferences, savePromotionalPreferences, promotionalPreferences, validatePromotionalPreferences } from './preferences.js';

describe('promotional preferences', () => {
  it('defaults new customers to enabled and preserves explicit opt-outs', () => {
    expect(promotionalPreferences(undefined)).toEqual({ sms: true, push: true, email: true });
    expect(promotionalPreferences({ sms: false, push: false, email: true })).toEqual({ sms: false, push: false, email: true });
  });
  it('rejects incomplete, untyped and unexpected settings', () => {
    for (const input of [null, [], {}, { sms: 'false', push: true, email: true }, { sms: true, push: true, email: true, customer_id: 'another-account' }]) {
      expect(() => validatePromotionalPreferences(input)).toThrow();
    }
  });
});

beforeEach(() => vi.resetAllMocks());
describe('account preference persistence', () => {
  it('reads only the authenticated account and retains its disabled channel', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: { customer_promotional_preferences: { sms: false } } } }, error: null });
    const json = vi.fn(), next = vi.fn();
    await getPromotionalPreferences({ user: { id: 'customer-1' } } as AuthedRequest, { json } as unknown as Response, next);
    expect(mocks.getUser).toHaveBeenCalledWith('customer-1');
    expect(json).toHaveBeenCalledWith({ sms: false, push: true, email: true });
    expect(next).not.toHaveBeenCalled();
  });
  it('reports save failures instead of claiming success', async () => {
    mocks.updateUser.mockResolvedValue({ error: new Error('offline') });
    const json = vi.fn(), next = vi.fn();
    await savePromotionalPreferences({ user: { id: 'customer-1' }, body: { sms: false, push: true, email: true } } as AuthedRequest, { json } as unknown as Response, next);
    expect(mocks.updateUser).toHaveBeenCalledWith('customer-1', { user_metadata: { customer_promotional_preferences: { sms: false, push: true, email: true } } });
    expect(json).not.toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 503 });
  });
});
