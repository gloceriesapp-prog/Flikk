// Admin override for a number's account_type pin — the escape valve the founder
// chose. The pin (migration 20261011000000_account_type_pin.sql) is immutable
// from the apps' side: backend/src/routes/auth.ts rejects a number signing into
// a different app with ACCOUNT_WRONG_APP. This flips that one column so a
// mis-pinned number can be moved to the right app. Same small, dedicated-route
// shape as app/api/products/[id]/approval.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const ACCOUNT_TYPES = ['customer', 'rider', 'store_owner'] as const;

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  const { account_type } = (await request.json().catch(() => ({}))) as { account_type?: string };
  if (!ACCOUNT_TYPES.includes(account_type as (typeof ACCOUNT_TYPES)[number])) {
    return NextResponse.json({ error: 'Pick customer, rider, or store_owner.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ account_type })
    .eq('id', id)
    .select('id')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Could not find that user.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
