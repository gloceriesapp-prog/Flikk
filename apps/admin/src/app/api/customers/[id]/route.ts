// One customer's full account view — profile, real addresses, real order
// history. Service-role, same rationale as app/api/customers/route.ts's
// own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { activeBlock, type CustomerBlockRow } from '@/lib/customerBlocks';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { adminRpcErrorResponse, isUuid } from '@/lib/orders/adminActor';

export async function GET(request: Request, ctx: RouteContext<'/api/customers/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const [userRes, addressesRes, ordersRes, blockRes] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, email, phone, created_at').eq('id', id).eq('role', 'customer').maybeSingle(),
      // Soft-deleted addresses (031) are history, not where the customer is now.
      supabaseAdmin.from('addresses').select('id, label, line1, landmark, is_default').eq('user_id', id).is('deleted_at', null),
      supabaseAdmin
        .from('orders')
        .select('id, status, total, placed_at, stores(name)')
        .eq('customer_id', id)
        .order('placed_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('customer_blocks')
        .select('user_id, reason, blocked_at, blocked_until, unblocked_at')
        .eq('user_id', id)
        .order('blocked_at', { ascending: false })
        .limit(10),
    ]);
    if (userRes.error) throw userRes.error;
    if (!userRes.data) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    if (addressesRes.error) throw addressesRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (blockRes.error) throw blockRes.error;
    const blockRows = (blockRes.data ?? []) as CustomerBlockRow[];
    // Auth's banned_until is what the backend actually enforces; the
    // customer_blocks row adds the reason. A ban with no row (set elsewhere)
    // still shows as blocked.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
    const bannedUntil = (authUser?.user as { banned_until?: string } | undefined)?.banned_until ?? null;
    const banned = !!bannedUntil && Date.parse(bannedUntil) > Date.now();
    const recorded = activeBlock(blockRows[0]);
    const block = banned
      ? { reason: recorded?.reason ?? 'Blocked outside the admin panel', blockedAt: recorded?.blockedAt ?? null, blockedUntil: recorded ? recorded.blockedUntil : bannedUntil }
      : null;

    return NextResponse.json({
      id: userRes.data.id,
      name: userRes.data.name,
      email: userRes.data.email,
      phone: userRes.data.phone,
      createdAt: userRes.data.created_at,
      block,
      blockHistory: blockRows.map((b) => ({ reason: b.reason, blockedAt: b.blocked_at, blockedUntil: b.blocked_until, unblockedAt: b.unblocked_at })),
      addresses: (addressesRes.data ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        landmark: a.landmark,
        isDefault: a.is_default,
      })),
      orders: (ordersRes.data ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        total: Number(o.total),
        placedAt: o.placed_at,
        storeName: (o.stores as unknown as { name: string } | null)?.name ?? 'Unknown store',
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load this customer.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Edit a customer's name and contact email (migration 117's
// admin_update_customer_profile: validated, audited in admin_control_audit with
// the before/after values). Phone is the sign-in identity (phone OTP) and is
// not editable here. The customer app reads the name from GET /auth/me.
export async function PATCH(request: Request, ctx: RouteContext<'/api/customers/[id]'>) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown } | null;
  if (typeof body?.name !== 'string' || (body.email != null && typeof body.email !== 'string')) {
    return NextResponse.json({ error: 'Give a name and an optional email.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('admin_update_customer_profile', {
    p_customer: id,
    p_name: body.name,
    p_email: (body.email as string | null | undefined) ?? null,
    p_admin_email: actor.email,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const mapped = adminRpcErrorResponse(error);
    if (mapped) return mapped;
    return NextResponse.json({ error: 'Could not save this customer.' }, { status: 500 });
  }
  const saved = data as { name: string; email: string | null };
  return NextResponse.json({ name: saved.name, email: saved.email });
}
