// Block / unblock a customer account.
// The ban itself is Supabase Auth's banned_until (auth.admin.updateUserById
// ban_duration): request_auth_context_v2 (migration 071) treats a banned user's
// session as invalid on every authenticated backend request, and the backend
// answers 403 ACCOUNT_BLOCKED (migration 110's auth_account_blocked) so the
// customer app can say why. Supabase Auth also refuses OTP sign-in and token
// refresh for a banned user. customer_blocks (migration 110) is the audit
// trail: who, why, until when, and when it was lifted.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { BLOCK_DURATIONS, type BlockDuration } from '@/lib/customerBlocks';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Supabase has no "forever" ban; ~100 years is its documented equivalent.
const INDEFINITE_BAN = '876000h';

async function loadCustomer(id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseAdmin.from('users').select('id').eq('id', id).eq('role', 'customer').maybeSingle();
  return data;
}

export async function POST(request: Request, ctx: RouteContext<'/api/customers/[id]/block'>) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!(await loadCustomer(id))) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { reason?: unknown; duration?: unknown } | null;
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 3 || reason.length > 500) return NextResponse.json({ error: 'Give a reason (3–500 characters).' }, { status: 400 });
  const duration = body?.duration as BlockDuration;
  const option = BLOCK_DURATIONS.find((d) => d.value === duration);
  if (!option) return NextResponse.json({ error: 'Pick a block duration.' }, { status: 400 });

  const blockedAt = new Date();
  const blockedUntil = option.hours === null ? null : new Date(blockedAt.getTime() + option.hours * 3_600_000);
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: option.hours === null ? INDEFINITE_BAN : `${option.hours}h`,
  });
  if (banError) return NextResponse.json({ error: `Could not block this account: ${banError.message}` }, { status: 502 });

  // Close any earlier open record so there is one live block per customer.
  await supabaseAdmin.from('customer_blocks').update({ unblocked_at: blockedAt.toISOString(), unblocked_by: user.id }).eq('user_id', id).is('unblocked_at', null);
  const { error } = await supabaseAdmin.from('customer_blocks').insert({
    user_id: id,
    reason,
    blocked_by: user.id,
    blocked_at: blockedAt.toISOString(),
    blocked_until: blockedUntil?.toISOString() ?? null,
  });
  if (error) {
    // Never leave an unrecorded ban behind.
    await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' });
    return NextResponse.json({ error: 'Could not record the block. Nothing was changed.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, blockedUntil: blockedUntil?.toISOString() ?? null });
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/customers/[id]/block'>) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!(await loadCustomer(id))) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' });
  if (banError) return NextResponse.json({ error: `Could not unblock this account: ${banError.message}` }, { status: 502 });
  const { error } = await supabaseAdmin
    .from('customer_blocks')
    .update({ unblocked_at: new Date().toISOString(), unblocked_by: user.id })
    .eq('user_id', id)
    .is('unblocked_at', null);
  if (error) return NextResponse.json({ error: 'Unblocked, but the block history could not be updated.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
