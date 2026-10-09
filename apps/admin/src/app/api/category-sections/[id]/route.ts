// Server-side delete for one category-section title — same service_role
// rationale as app/api/category-sections/route.ts's own note. Categories
// under a deleted title aren't deleted with it — categories.section_id has
// on delete set null (see the migration), so they just become untitled
// until re-assigned rather than silently disappearing along with the title.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function DELETE(request: Request, ctx: RouteContext<'/api/category-sections/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('category_sections').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete title.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
