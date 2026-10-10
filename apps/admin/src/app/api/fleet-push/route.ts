// Fleet broadcast — a free-text operational push to every rider, only the
// online riders, or every store partner (CLAUDE.md: all three operational roles
// are native apps now). POST records + rate-limits + resolves tokens in the
// admin_send_fleet_push RPC (migration 20261010120000), then sends them through
// Expo best-effort. GET lists recent fleet sends. The customer push lives in a
// separate /api/push-messages route; both share the admin_push_messages table
// but never mix audiences.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { controlRpcStatus } from '@/lib/pushOutbox';
import {
  FLEET_AUDIENCES,
  type FleetAudience,
  fleetPushMessages,
  sendFleetPushNotifications,
  validateFleetPushInput,
} from '@/lib/fleetPush';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin
    .from('admin_push_messages')
    .select('id, audience, title, body, recipient_count, admin_email, created_at')
    .in('audience', FLEET_AUDIENCES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: 'Could not load sent broadcasts.' }, { status: 500 });
  return NextResponse.json(
    (data ?? []).map((m) => ({
      id: m.id,
      audience: m.audience as FleetAudience,
      title: m.title,
      body: m.body,
      recipients: m.recipient_count,
      adminEmail: m.admin_email,
      createdAt: m.created_at,
    })),
  );
}

export async function POST(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const raw = (await request.json().catch(() => null)) as { audience?: unknown; title?: unknown; body?: unknown } | null;
  const valid = validateFleetPushInput(raw ?? {});
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  const { audience, title, body } = valid.value;

  const { data, error } = await supabaseAdmin.rpc('admin_send_fleet_push', {
    p_audience: audience,
    p_title: title,
    p_body: body,
    p_admin_email: actor.email,
  });
  if (error) {
    const status = controlRpcStatus(error.code);
    return NextResponse.json({ error: status ? error.message : 'Could not send the broadcast.' }, { status: status ?? 500 });
  }

  const row = data as { message_id: string; recipient_count: number; tokens: string[] | null } | null;
  if (!row) return NextResponse.json({ error: 'Could not send the broadcast.' }, { status: 500 });
  await sendFleetPushNotifications(fleetPushMessages(row.tokens ?? [], audience, title, body));
  return NextResponse.json({ messageId: row.message_id, recipientCount: row.recipient_count, audience });
}
