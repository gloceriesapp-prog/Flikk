import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ authorized: true, reviewFail: false, lookupFail: false, removalFail: false, completionFail: false, deleted: false, status: 'approved', calls: [] as string[] }));
vi.mock('@/lib/supabase/server', () => ({ requireAdminSession: async () => fixture.authorized ? { id: 'admin', email: 'nishalpoojary810@gmail.com' } : null }));
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {
 rpc: async (name: string) => { fixture.calls.push(name); return { data: { status: fixture.status, customer_id: 'customer' }, error: (name === 'review_customer_deletion' ? fixture.reviewFail : fixture.completionFail) ? new Error('Unavailable') : null }; },
 auth: { admin: {
  getUserById: async () => { fixture.calls.push('getUser'); return { data: { user: { deleted_at: fixture.deleted ? '2026-10-05' : null } }, error: fixture.lookupFail ? new Error('Unavailable') : null }; },
  deleteUser: async () => { fixture.calls.push('deleteUser'); return { error: fixture.removalFail ? new Error('Unavailable') : null }; },
 } },
} }));
import { POST } from '../../../apps/admin/src/app/api/customer-deletions/[id]/route';
const params = { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) };
const request = () => new Request('https://admin.test/deletion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approve: true, note: 'Reviewed outstanding activity' }) });
beforeEach(() => { Object.assign(fixture, { authorized: true, reviewFail: false, lookupFail: false, removalFail: false, completionFail: false, deleted: false, status: 'approved', calls: [] }); });
it('rejects unauthorized actors without privileged calls', async () => { fixture.authorized = false; expect((await POST(request(), params)).status).toBe(401); expect(fixture.calls).toEqual([]); });
it('does not disable identity when database approval is blocked', async () => { fixture.reviewFail = true; expect((await POST(request(), params)).status).toBe(409); expect(fixture.calls).toEqual(['review_customer_deletion']); });
it('does not remove a user after an unavailable auth lookup', async () => { fixture.lookupFail = true; expect((await POST(request(), params)).status).toBe(503); expect(fixture.calls).not.toContain('deleteUser'); });
it('finishes already-disabled identities without another deletion', async () => { fixture.deleted = true; expect((await POST(request(), params)).status).toBe(200); expect(fixture.calls).toEqual(['review_customer_deletion', 'getUser', 'complete_customer_deletion']); });
it('retains durable approval when identity or cleanup fails', async () => {
 fixture.removalFail = true; expect((await POST(request(), params)).status).toBe(503); expect(fixture.calls).not.toContain('complete_customer_deletion');
 fixture.removalFail = false; fixture.completionFail = true; expect((await POST(request(), params)).status).toBe(503);
});
it('returns completed requests without removing identity again', async () => { fixture.status = 'completed'; expect((await POST(request(), params)).status).toBe(200); expect(fixture.calls).toEqual(['review_customer_deletion']); });
