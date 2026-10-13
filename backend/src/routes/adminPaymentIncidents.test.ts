import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), rpc: vi.fn() }));
vi.mock('../../../apps/admin/src/lib/auth/requireAdmin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../../../apps/admin/src/lib/supabase/admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { PATCH } from '../../../apps/admin/src/app/api/payment-incidents/route';
import { paymentProviderLabel } from '../../../apps/admin/src/lib/types';
const id = '00000000-0000-4000-8000-000000000100';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ actor: { email: 'verified-admin@example.com' }, denied: null });
  mocks.rpc.mockResolvedValue({ data: {}, error: null });
});
function request(body: unknown) { return new Request('https://admin.example/api/payment-incidents', { method: 'PATCH', body: JSON.stringify(body) }); }
it('denies untrusted callers before parsing or touching financial records', async () => {
  mocks.requireAdmin.mockResolvedValue({ actor: null, denied: new Response(null, { status: 401 }) });
  expect((await PATCH(request({ incidentId: id, reference: 'REF123' }))).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('requires a real incident ID and bounded reconciliation reference', async () => {
  for (const body of [{ incidentId: 'invalid', reference: 'REF123' }, { incidentId: id, reference: 'x' }, { incidentId: id, reference: 'a'.repeat(65) }, { incidentId: id, reference: '<script>' }]) {
    expect((await PATCH(request(body))).status).toBe(400);
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('uses the authenticated admin identity and an audited RPC, never client actor data', async () => {
  expect((await PATCH(request({ incidentId: id, reference: ' RZP-REF-123 ', adminEmail: 'forged@example.com' }))).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith('resolve_checkout_payment_incident', {
    p_incident: id, p_reference: 'RZP-REF-123', p_admin_email: 'verified-admin@example.com',
  });
});
it('reports state conflicts without exposing database details', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'private SQL value' } });
  const result = await PATCH(request({ incidentId: id, reference: 'REF123' }));
  expect(result.status).toBe(409);
  expect(await result.text()).not.toContain('private SQL');
});
it('labels original providers and unknown records without relabelling old money', () => {
  expect(paymentProviderLabel('razorpay')).toBe('Razorpay');
  expect(paymentProviderLabel('cashfree')).toContain('Previous provider');
  expect(paymentProviderLabel(null)).toContain('Unknown provider');
});
