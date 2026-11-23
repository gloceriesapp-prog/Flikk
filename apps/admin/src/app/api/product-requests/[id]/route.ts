// Mark one product request done (or back to new).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { status } = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (status !== 'new' && status !== 'done') return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  const { error } = await supabaseAdmin.from('product_requests').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update the request.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
