import { NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { requireAdminSession } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeOwnerPhone, ownerPhoneVariants } from '@/lib/storeValidation';
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: RouteContext<'/api/stores/[id]/team'>) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await ctx.params;
    if (!uuid.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });
    const { data: store, error: storeError } = await supabaseAdmin.from('stores').select('owner_user_id').eq('id', id).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    const { data: members, error } = await supabaseAdmin.from('store_memberships').select('user_id, role').eq('store_id', id).eq('is_active', true);
    if (error) throw error;
    const ids = [store.owner_user_id, ...(members ?? []).map(member => member.user_id)];
    const { data: users, error: usersError } = await supabaseAdmin.from('users').select('id, name, phone, expo_push_token, is_approved').in('id', ids);
    if (usersError) throw usersError;
    return NextResponse.json((users ?? []).map(user => ({ id: user.id, name: user.name, phone: user.phone,
      role: user.id === store.owner_user_id ? 'owner' : 'manager',
      pushRegistered: typeof user.expo_push_token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(user.expo_push_token),
      approved: user.is_approved,
    })));
  } catch { return NextResponse.json({ error: 'Could not load store team.' }, { status: 500 }); }
}
export async function POST(request: Request, ctx: RouteContext<'/api/stores/[id]/team'>) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await ctx.params;
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Invalid team changes.' }, { status: 400 });
      body = parsed as Record<string, unknown>;
    } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
    if (!uuid.test(id) || typeof body.active !== 'boolean') return NextResponse.json({ error: 'Invalid team changes.' }, { status: 400 });
    let userId: string;
    if (body.active) {
      const phone = normalizeOwnerPhone(body.phone);
      if (!phone) return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
      const { data: user, error } = await supabaseAdmin.from('users').select('id').in('phone', ownerPhoneVariants(phone)).maybeSingle();
      if (error) throw error;
      if (!user) return NextResponse.json({ error: 'This person must sign in to Gloceries first.' }, { status: 404 });
      userId = user.id;
    } else {
      if (typeof body.userId !== 'string' || !uuid.test(body.userId)) return NextResponse.json({ error: 'Invalid member.' }, { status: 400 });
      userId = body.userId;
    }
    const admin = await requireAdminSession();
    if (!admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 });
    const { error } = await supabaseAdmin.rpc('manage_store_member', { p_store: id, p_user: userId, p_admin: admin.id, p_active: body.active });
    if (error) {
      const known = ['PRIMARY_OWNER_IMMUTABLE', 'INELIGIBLE_MEMBER', 'ALREADY_STORE_OWNER', 'MEMBER_HAS_ANOTHER_STORE', 'MEMBER_NOT_FOUND', 'TEAM_LIMIT_REACHED'];
      if (known.some(code => error.message.includes(code))) return NextResponse.json({ error: 'This account cannot be assigned or removed. Owners and riders must keep their existing role, and managers can belong to one store, with at most 20 managers per store.' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Could not save store team. Please retry.' }, { status: 500 }); }
}
