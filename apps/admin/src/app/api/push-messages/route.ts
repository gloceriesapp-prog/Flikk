// Admin push to one customer or every customer. POST queues the message in
// the existing customer push outbox through admin_send_customer_push
// (migration 117): it also lands in each customer's in-app inbox, the backend
// notification worker delivers it, and the send is rate-limited (one
// all-customers message per hour, three per day; 30 single-customer messages
// per hour, three per customer) and audited. GET lists recent sends.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import { controlRpcStatus } from '@/lib/pushOutbox';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin
    .from('admin_push_messages')
    .select('id, audience, customer_id, title, body, recipient_count, admin_email, created_at, users(name, phone)')
    .in('audience', ['customer', 'all_customers'])
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: 'Could not load sent messages.' }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((m) => {
      const customer = m.users as unknown as { name: string | null; phone: string } | null;
      return {
        id: m.id,
        audience: m.audience,
        customerId: m.customer_id,
        customerLabel: customer ? customer.name ?? customer.phone : null,
        title: m.title,
        body: m.body,
        recipients: m.recipient_count,
        adminEmail: m.admin_email,
        createdAt: m.created_at,
      };
    }),
  );
}

// "98765 43210" / "+91 98765-43210" -> "+919876543210" (users.phone format).
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

export async function POST(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as
    | { audience?: unknown; customerId?: unknown; customerPhone?: unknown; title?: unknown; body?: unknown }
    | null;
  if (typeof body?.title !== 'string' || typeof body.body !== 'string' || (body.audience !== 'customer' && body.audience !== 'all')) {
    return NextResponse.json({ error: 'Give a title, a message and who to send it to.' }, { status: 400 });
  }

  let customerId: string | null = null;
  if (body.audience === 'customer') {
    if (isUuid(body.customerId)) {
      customerId = body.customerId;
    } else {
      const phone = typeof body.customerPhone === 'string' ? normalizePhone(body.customerPhone) : null;
      if (!phone) return NextResponse.json({ error: 'Enter the customer’s 10-digit phone number.' }, { status: 400 });
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('phone', phone).eq('role', 'customer').maybeSingle();
      if (!user) return NextResponse.json({ error: 'No customer with that phone number.' }, { status: 404 });
      customerId = user.id;
    }
  }

  const { data, error } = await supabaseAdmin.rpc('admin_send_customer_push', {
    p_title: body.title,
    p_body: body.body,
    p_customer: customerId,
    p_admin_email: actor.email,
  });
  if (error) {
    const status = controlRpcStatus(error.code);
    return NextResponse.json({ error: status ? error.message : 'Could not queue this message.' }, { status: status ?? 500 });
  }
  return NextResponse.json(data);
}
