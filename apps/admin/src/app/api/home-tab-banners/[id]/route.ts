// Server-side delete for one Home-tab banner — same service_role rationale
// as app/api/home-tab-banners/route.ts's own note. No PATCH: the add form
// collects photo+badge+heading+subheading together in one submit, nothing
// here is editable after creation — delete and re-add instead.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { toHomeTabErrorMessage } from '@/lib/homeTabValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function DELETE(request: Request, ctx: RouteContext<'/api/home-tab-banners/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('home_tab_banners').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not delete banner.') }, { status: 400 });
  }
}
