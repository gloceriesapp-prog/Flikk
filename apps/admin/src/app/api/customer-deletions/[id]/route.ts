import { requireAdminSession } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminSession();
  if (!actor) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.approve !== 'boolean' || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000)
    return Response.json({ error: 'Add a review note.' }, { status: 400 });
  const { data, error } = await supabaseAdmin.rpc('review_customer_deletion', { p_id: id, p_actor: actor.id, p_approve: body.approve, p_note: body.note.trim() });
  if (error) return Response.json({ error: 'Resolve active orders, pending refunds and support tickets before approving. The request must still be open.' }, { status: 409 });
  if (data.status !== 'approved') return Response.json({ status: data.status });
  // Auth soft deletion retains historical foreign keys while invalidating the
  // login identity. If completion fails, approved state is durable and retriable.
  const { data: authUser, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(data.customer_id);
  if (lookupError) return Response.json({ error: 'Approval saved. Identity lookup failed; retry this request.' }, { status: 503 });
  if (!authUser.user?.deleted_at) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.customer_id, true);
    if (authError) return Response.json({ error: 'Approval saved. Identity removal failed; retry this request.' }, { status: 503 });
  }
  const { error: completeError } = await supabaseAdmin.rpc('complete_customer_deletion', { p_id: id, p_actor: actor.id });
  if (completeError) return Response.json({ error: 'Identity disabled. Retry to finish profile cleanup.' }, { status: 503 });
  return Response.json({ status: 'completed' });
}
