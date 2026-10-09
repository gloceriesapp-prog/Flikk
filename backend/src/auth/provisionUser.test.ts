import { beforeEach, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ read: vi.fn(), upsert: vi.fn(), from: vi.fn() }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: database.from } }));
import { verifiedUserProfile } from './provisionUser.js';

beforeEach(() => {
  vi.resetAllMocks();
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: database.read }) }), upsert: database.upsert });
});
it('fails closed on read errors without provisioning or assuming customer role', async () => {
  database.read.mockResolvedValue({ error: { code: 'DB_DOWN' }, data: null });
  await expect(verifiedUserProfile('user', '+919876543210')).rejects.toMatchObject({ status: 503 });
  expect(database.upsert).not.toHaveBeenCalled();
});
it('keeps an existing approved role unchanged', async () => {
  database.read.mockResolvedValue({ error: null, data: { role: 'rider', is_approved: true } });
  expect(await verifiedUserProfile('user', '+919876543210')).toEqual({ role: 'rider', is_approved: true });
  expect(database.upsert).not.toHaveBeenCalled();
});
it('uses conflict-safe provisioning then reads the authoritative profile', async () => {
  database.read.mockResolvedValueOnce({ error: null, data: null }).mockResolvedValueOnce({ error: null, data: { role: 'store_owner', is_approved: true } });
  database.upsert.mockResolvedValue({ error: null });
  expect(await verifiedUserProfile('user', '+919876543210')).toEqual({ role: 'store_owner', is_approved: true });
  expect(database.upsert).toHaveBeenCalledWith({ id: 'user', phone: '+919876543210', role: 'customer' }, { onConflict: 'id', ignoreDuplicates: true });
});
it('does not complete sign-in when provisioning or reread fails', async () => {
  database.read.mockResolvedValue({ error: null, data: null });
  database.upsert.mockResolvedValueOnce({ error: { code: 'DB_DOWN' } }).mockResolvedValueOnce({ error: null });
  await expect(verifiedUserProfile('user', '+919876543210')).rejects.toMatchObject({ status: 503 });
  await expect(verifiedUserProfile('user', '+919876543210')).rejects.toMatchObject({ status: 503 });
});
