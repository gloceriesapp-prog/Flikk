import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ authenticated: true, from: vi.fn(), update: vi.fn(), eq: vi.fn(), error: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({ requireAdminSession: async () => mocks.authenticated ? { id: 'admin' } : null }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));
import { GET, PATCH } from '../../../apps/admin/src/app/api/delivery-settings/route';

const body = { estimatedDeliveryMinutes: 30, flatDeliveryFee: 25, freeDeliveryEnabled: false,
  freeDeliveryThreshold: 199, handlingFee: 5 };
const request = (value: unknown) => new Request('http://localhost/api/delivery-settings', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
});
beforeEach(() => {
  mocks.authenticated = true;
  mocks.from.mockClear();
  mocks.update.mockClear();
  mocks.eq.mockClear();
  mocks.error = null;
  mocks.from.mockImplementation(() => {
    const query = { update: vi.fn((value) => { mocks.update(value); return query; }),
      eq: vi.fn((key, value) => { mocks.eq(key, value); return query; }),
      select: vi.fn(() => query), single: async () => ({ error: mocks.error, data: {
        id: 'settings-id',
        flat_delivery_fee: 25, free_delivery_enabled: false, free_delivery_threshold: 199,
        handling_fee: 5, estimated_delivery_minutes: 30,
      } }) };
    return query;
  });
});
describe('admin delivery estimate setting', () => {
  it('requires authentication before reading or updating settings', async () => {
    mocks.authenticated = false;
    expect((await GET()).status).toBe(401);
    expect((await PATCH(request(body))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([0, -1, 241, 1.5, '30', true, null, undefined])('rejects invalid minutes %s before updating any fees', async (value) => {
    expect((await PATCH(request({ ...body, estimatedDeliveryMinutes: value }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('saves and returns one shared estimate alongside the existing fees', async () => {
    const response = await PATCH(request(body));
    expect(response.status).toBe(200);
    expect((await response.json()).estimatedDeliveryMinutes).toBe(30);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ estimated_delivery_minutes: 30,
      flat_delivery_fee: 25, handling_fee: 5 }));
    expect(mocks.eq).toHaveBeenCalledWith('id', 'settings-id');
  });
  it('fails without updating when the singleton cannot be identified', async () => {
    mocks.error = { code: 'PGRST116', message: 'private database details' };
    const response = await PATCH(request(body));
    expect(response.status).toBe(500);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain('private database details');
  });
});
