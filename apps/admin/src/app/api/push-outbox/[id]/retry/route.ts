// Requeue one unsent push (admin_retry_customer_notification, migration 117:
// refuses sent or currently-sending rows, audited). The backend worker picks
// it up on its next pass and still skips devices that already accepted it.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import { controlRpcStatus } from '@/lib/pushOutbox';

export async function POST(_request: Request, ctx: RouteContext<'/api/push-outbox/[id]/retry'>) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  const { error } = await supabaseAdmin.rpc('admin_retry_customer_notification', { p_id: id, p_admin_email: actor.email });
  if (error) {
    const status = controlRpcStatus(error.code);
    return NextResponse.json({ error: status ? error.message : 'Could not retry this notification.' }, { status: status ?? 500 });
  }
  return NextResponse.json({ ok: true });
}
