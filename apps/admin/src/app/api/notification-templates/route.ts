// Customer order-update notification wording (customer_notification_templates,
// migration 117). record_customer_order_notification reads the row for the new
// order status when it writes the inbox/push row, so a change applies to the
// next status change. Defaults are the wording that used to be hard-coded.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminActor } from '@/lib/orders/adminActor';
import { TEMPLATE_EVENT_LABEL } from '@/lib/pushOutbox';

export async function GET() {
  const { denied } = await requireAdminActor();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin
    .from('customer_notification_templates')
    .select('event, title, body, default_title, default_body, updated_at, updated_by');
  if (error) return NextResponse.json({ error: 'Could not load notification templates. Apply migration 117 if this is a new database.' }, { status: 500 });
  const order = Object.keys(TEMPLATE_EVENT_LABEL);
  return NextResponse.json(
    (data ?? [])
      .sort((a, b) => order.indexOf(a.event) - order.indexOf(b.event))
      .map((t) => ({
        event: t.event,
        label: TEMPLATE_EVENT_LABEL[t.event] ?? t.event,
        title: t.title,
        body: t.body,
        defaultTitle: t.default_title,
        defaultBody: t.default_body,
        updatedAt: t.updated_at,
        updatedBy: t.updated_by,
      })),
  );
}
