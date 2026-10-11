import { beforeEach, expect, it, vi } from 'vitest';

const fx = vi.hoisted(() => ({
  owners: [] as { id: string; role: string }[],
  owned: 0,
  zones: [{ id: 'zone-1' }] as { id: string }[],
  inserted: null as Record<string, unknown> | null,
  userUpdate: null as Record<string, unknown> | null,
  insertError: null as { code: string; message: string } | null,
}));
vi.mock('@/lib/auth/requireAdmin', () => ({ requireAdmin: async () => ({ actor: { id: 'admin', email: 'nishalpoojary810@gmail.com' }, denied: null }) }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: (table: string) => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: (_cols: string, opts?: { head?: boolean }) => {
      if (opts?.head) return { eq: async () => ({ count: fx.owned, error: null }) };
      return chain;
    },
    in: () => chain,
    limit: async () => ({ data: fx.owners, error: null }),
    eq: (col: string) => {
      if (table === 'zones' && col === 'is_active') return Promise.resolve({ data: fx.zones, error: null });
      if (table === 'users' && fx.userUpdate) return Promise.resolve({ error: null });
      return Promise.resolve({ error: null });
    },
    insert: (row: Record<string, unknown>) => { fx.inserted = row; return chain; },
    single: async () => (fx.insertError ? { data: null, error: fx.insertError } : { data: { ...fx.inserted, id: 'store-1', created_at: '2026-01-01' }, error: null }),
    update: (row: Record<string, unknown>) => { if (table === 'users') fx.userUpdate = row; return chain; },
    delete: () => chain,
  });
  return chain;
} } }));
import { POST } from '../../../apps/admin/src/app/api/stores/route';
import { normalizeOwnerPhone } from '../../../apps/admin/src/lib/storeValidation';

const valid = {
  name: 'Shop', category: 'Kirana & Grocery', ownerName: 'Owner', ownerPhone: '98765 43210', addressLine: '1 Road', city: 'Kaup',
  state: 'Karnataka', country: 'India', lat: 13.22, lng: 74.75, openTime: '09:00', closeTime: '21:00',
  fssaiNumber: '12345678901234', shopEstablishmentNumber: 'SE-1', panNumber: 'abcde1234f',
};
const post = (body: unknown) => POST(new Request('https://admin.test/api/stores', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  fx.owners = [{ id: 'user-1', role: 'customer' }]; fx.owned = 0; fx.zones = [{ id: 'zone-1' }];
  fx.inserted = null; fx.userUpdate = null; fx.insertError = null;
});

it('normalizes the owner phone the way OTP sign-in stores it', () => {
  expect(normalizeOwnerPhone('+91 98765-43210')).toBe('+919876543210');
  expect(normalizeOwnerPhone('12345')).toBeNull();
});

it('creates the store owned by the account with that phone and approves it as a store owner', async () => {
  const res = await post(valid);
  expect(res.status).toBe(200);
  expect(fx.inserted).toMatchObject({ owner_user_id: 'user-1', zone_id: 'zone-1', lat: 13.22, lng: 74.75, pan_number: 'ABCDE1234F' });
  expect(fx.inserted).not.toHaveProperty('aadhaar_last4');
  expect(fx.userUpdate).toEqual({ role: 'store_owner', is_approved: true, is_rejected: false });
});

it('requires a map pin and an owner phone', async () => {
  expect((await post({ ...valid, lat: undefined })).status).toBe(400);
  expect((await post({ ...valid, ownerPhone: '' })).status).toBe(400);
  expect(fx.inserted).toBeNull();
});

it('refuses unknown phones, other roles and owners who already have a store', async () => {
  fx.owners = [];
  expect((await post(valid)).status).toBe(404);
  fx.owners = [{ id: 'rider-1', role: 'rider' }];
  expect((await post(valid)).status).toBe(409);
  fx.owners = [{ id: 'user-1', role: 'store_owner' }]; fx.owned = 1;
  expect((await post(valid)).status).toBe(409);
  expect(fx.inserted).toBeNull();
});

it('asks for a zone when several are active', async () => {
  fx.zones = [{ id: 'zone-1' }, { id: 'zone-2' }];
  expect((await post(valid)).status).toBe(400);
  expect((await post({ ...valid, zoneId: 'zone-2' })).status).toBe(200);
  expect(fx.inserted).toMatchObject({ zone_id: 'zone-2' });
});
