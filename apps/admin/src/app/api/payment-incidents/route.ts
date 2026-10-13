import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { manualRefundReference } from '@/lib/refunds/failedDeliveryRefund';

// Records an investigation already completed by an operator. No provider
// payment/refund endpoint is called; the audited DB transition is atomic.
export async function PATCH(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { incidentId?: unknown; reference?: unknown } | null;
  const reference = manualRefundReference(body?.reference);
  if (typeof body?.incidentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.incidentId) || !reference) {
    return NextResponse.json({ error: 'Give an incident ID and investigation or refund reference (4–64 characters).' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.rpc('resolve_checkout_payment_incident', {
    p_incident: body.incidentId, p_reference: reference, p_admin_email: actor.email,
  });
  if (error) return NextResponse.json({ error: 'Could not resolve this incident. Refresh its status and try again.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
