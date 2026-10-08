// Save one order-update template through admin_update_notification_template
// (migration 117: validated, audited in admin_control_audit).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminActor } from '@/lib/orders/adminActor';
import { controlRpcStatus } from '@/lib/pushOutbox';

export async function PATCH(request: Request, ctx: RouteContext<'/api/notification-templates/[event]'>) {
  const { actor, denied } = await requireAdminActor();
  if (denied) return denied;
  const { event } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { title?: unknown; body?: unknown } | null;
  if (typeof body?.title !== 'string' || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'Give a title and a message.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('admin_update_notification_template', {
    p_event: event,
    p_title: body.title,
    p_body: body.body,
    p_admin_email: actor.email,
  });
  if (error) {
    const status = controlRpcStatus(error.code);
    return NextResponse.json({ error: status ? error.message : 'Could not save this notification.' }, { status: status ?? 500 });
  }
  return NextResponse.json(data);
}
